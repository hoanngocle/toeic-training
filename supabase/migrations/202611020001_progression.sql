BEGIN;
CREATE TABLE public.learning_exp_ledger (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  source_type text NOT NULL CHECK(source_type IN ('vocabulary','essential')),
  source_id text NOT NULL,
  amount bigint NOT NULL CHECK(amount BETWEEN 0 AND 9007199254740991),
  reward_version text NOT NULL,
  calculation jsonb NOT NULL,
  created_at timestamptz NOT NULL,
  PRIMARY KEY(user_id,source_type,source_id)
);
ALTER TABLE public.learning_exp_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_exp ON public.learning_exp_ledger FOR SELECT TO authenticated
  USING(user_id=(SELECT auth.uid()) AND (SELECT public.is_active_user()));
REVOKE ALL ON public.learning_exp_ledger FROM anon,authenticated;
GRANT SELECT ON public.learning_exp_ledger TO authenticated;
GRANT ALL ON public.learning_exp_ledger TO service_role;

CREATE FUNCTION public.progression_pending(p_user_id uuid) RETURNS boolean LANGUAGE sql STABLE SET search_path='' AS $$
  SELECT EXISTS(SELECT 1 FROM public.sessions s WHERE s.user_id=p_user_id AND NOT EXISTS(
    SELECT 1 FROM public.learning_exp_ledger l WHERE l.user_id=s.user_id AND l.source_type='vocabulary' AND l.source_id=s.id))
  OR EXISTS(SELECT 1 FROM public.essential_sessions s WHERE s.user_id=p_user_id AND NOT EXISTS(
    SELECT 1 FROM public.learning_exp_ledger l WHERE l.user_id=s.user_id AND l.source_type='essential' AND l.source_id=s.id))
$$;
REVOKE ALL ON FUNCTION public.progression_pending(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.progression_pending(uuid) TO authenticated,service_role;
CREATE FUNCTION public.read_progression(p_user_id uuid) RETURNS jsonb LANGUAGE sql STABLE SET search_path='' AS $$
  SELECT jsonb_build_object('totalExp',coalesce(sum(amount),0),'pending',public.progression_pending(p_user_id))
  FROM public.learning_exp_ledger WHERE user_id=p_user_id
$$;
REVOKE ALL ON FUNCTION public.read_progression(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.read_progression(uuid) TO authenticated,service_role;

-- Only trusted server code may supply a calculation from the shared TS module.
CREATE FUNCTION public.validate_learning_reward(p_calculation jsonb) RETURNS void LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
  IF p_calculation IS NULL OR jsonb_typeof(p_calculation)<>'object'
    OR p_calculation->>'version' IS DISTINCT FROM 'toeic-learning-v1'
    OR NOT (p_calculation ?& ARRAY['exp','questionCount','correctCount','baseTotal','scoreMultiplier'])
    OR jsonb_typeof(p_calculation->'exp') IS DISTINCT FROM 'number'
    OR jsonb_typeof(p_calculation->'questionCount') IS DISTINCT FROM 'number'
    OR jsonb_typeof(p_calculation->'correctCount') IS DISTINCT FROM 'number'
    OR jsonb_typeof(p_calculation->'baseTotal') IS DISTINCT FROM 'number'
    OR jsonb_typeof(p_calculation->'scoreMultiplier') IS DISTINCT FROM 'number'
  THEN RAISE EXCEPTION 'INVALID_REWARD'; END IF;
  IF (p_calculation->>'exp')::numeric NOT BETWEEN 0 AND 9007199254740991
    OR trunc((p_calculation->>'exp')::numeric)<>(p_calculation->>'exp')::numeric
    OR (p_calculation->>'questionCount')::numeric < 1
    OR trunc((p_calculation->>'questionCount')::numeric)<>(p_calculation->>'questionCount')::numeric
    OR (p_calculation->>'correctCount')::numeric NOT BETWEEN 0 AND (p_calculation->>'questionCount')::numeric
    OR trunc((p_calculation->>'correctCount')::numeric)<>(p_calculation->>'correctCount')::numeric
    OR (p_calculation->>'baseTotal')::numeric < 0
    OR (p_calculation->>'scoreMultiplier')::numeric NOT IN (0,0.5,0.7,1.5,2)
    OR (p_calculation->>'exp')::numeric <> floor((p_calculation->>'baseTotal')::numeric*(p_calculation->>'scoreMultiplier')::numeric)
  THEN RAISE EXCEPTION 'INVALID_REWARD'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.validate_learning_reward(jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.validate_learning_reward(jsonb) TO service_role;

CREATE FUNCTION public.record_learning_reward(p_user_id uuid,p_source_type text,p_source_id text,p_result jsonb) RETURNS jsonb
LANGUAGE plpgsql SET search_path='' AS $$
DECLARE calculation jsonb := p_result->'rewardCalculation'; before_exp numeric; after_exp numeric;
BEGIN
  -- Coordinate every grant with the same profile lock as the save RPCs.
  PERFORM 1 FROM public.profiles WHERE id=p_user_id AND NOT disabled FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'ACCOUNT_DISABLED'; END IF;
  IF public.progression_pending(p_user_id) THEN RAISE EXCEPTION 'PROGRESSION_BACKFILL_REQUIRED'; END IF;
  PERFORM public.validate_learning_reward(calculation);
  SELECT coalesce(sum(amount),0) INTO before_exp FROM public.learning_exp_ledger WHERE user_id=p_user_id;
  after_exp := before_exp+(calculation->>'exp')::numeric;
  IF after_exp>9007199254740991 THEN RAISE EXCEPTION 'EXP_OVERFLOW'; END IF;
  INSERT INTO public.learning_exp_ledger(user_id,source_type,source_id,amount,reward_version,calculation,created_at)
    VALUES(p_user_id,p_source_type,p_source_id,(calculation->>'exp')::bigint,calculation->>'version',calculation,(p_result->>'createdAt')::timestamptz);
  RETURN (p_result-'rewardCalculation'-'progressionChange'-'progressionTotals'-'reward') ||
    jsonb_build_object('reward',jsonb_build_object('exp',(calculation->>'exp')::bigint,'version',calculation->>'version'),
      'progressionTotals',jsonb_build_object('before',before_exp,'after',after_exp));
END $$;
REVOKE ALL ON FUNCTION public.record_learning_reward(uuid,text,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.record_learning_reward(uuid,text,text,jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.save_learning(p_user_id uuid,p_request jsonb,p_result jsonb) RETURNS jsonb
LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE prior public.sessions%ROWTYPE; old public.progress%ROWTYPE; answer jsonb;
  stamp timestamptz := (p_result->>'createdAt')::timestamptz;
  lesson_id text := p_request->>'lesson'; flash boolean := p_request->>'mode'='flashcard';
  right_answer boolean; next_streak integer; next_status text;
BEGIN
  PERFORM 1 FROM public.profiles WHERE id=p_user_id AND NOT disabled FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'ACCOUNT_DISABLED'; END IF;
  SELECT * INTO prior FROM public.sessions WHERE user_id=p_user_id AND id=p_request->>'id';
  IF FOUND THEN
    IF prior.request<>p_request THEN RAISE EXCEPTION 'REQUEST_CONFLICT'; END IF;
    IF public.progression_pending(p_user_id) THEN RAISE EXCEPTION 'PROGRESSION_BACKFILL_REQUIRED'; END IF;
    RETURN (prior.result-'rewardCalculation'-'progressionTotals'-'progressionChange') || (
      SELECT jsonb_build_object('reward',jsonb_build_object('exp',amount,'version',reward_version))
      FROM public.learning_exp_ledger WHERE user_id=p_user_id AND source_type='vocabulary' AND source_id=prior.id);
  END IF;
  IF p_request->>'retryOf' IS NOT NULL THEN
    SELECT * INTO prior FROM public.sessions WHERE user_id=p_user_id AND lesson=lesson_id AND mode='test' AND id=p_request->>'retryOf';
    IF NOT FOUND THEN RAISE EXCEPTION 'RETRY_NOT_FOUND'; END IF;
    IF (SELECT coalesce(jsonb_agg((value->>'wordId')::integer ORDER BY (value->>'wordId')::integer),'[]'::jsonb) FROM jsonb_array_elements(prior.result->'results') WHERE NOT (value->>'correct')::boolean)
       <> (SELECT jsonb_agg((value->>'wordId')::integer ORDER BY (value->>'wordId')::integer) FROM jsonb_array_elements(p_request->'answers'))
    THEN RAISE EXCEPTION 'RETRY_NOT_FOUND'; END IF;
  END IF;
  p_result := public.record_learning_reward(p_user_id,'vocabulary',p_request->>'id',p_result);
  INSERT INTO public.sessions(user_id,id,lesson,mode,created_at,request,result) VALUES(p_user_id,p_request->>'id',lesson_id,p_request->>'mode',stamp,p_request,p_result-'progressionTotals');
  FOR answer IN SELECT value FROM jsonb_array_elements(p_result->'results') LOOP
    SELECT * INTO old FROM public.progress WHERE user_id=p_user_id AND lesson=lesson_id AND word_id=(answer->>'wordId')::integer;
    right_answer := (answer->>'correct')::boolean;
    next_streak := CASE WHEN right_answer THEN coalesce(old.streak,0)+(CASE WHEN flash THEN 0 ELSE 1 END) ELSE 0 END;
    next_status := CASE WHEN NOT right_answer THEN 'learning' WHEN flash OR next_streak>=3 OR old.status='learned' THEN 'learned' ELSE 'learning' END;
    INSERT INTO public.progress VALUES(p_user_id,lesson_id,(answer->>'wordId')::integer,coalesce(old.reviews,0)+1,
      coalesce(old.correct,0)+(CASE WHEN NOT flash AND right_answer THEN 1 ELSE 0 END),
      coalesce(old.incorrect,0)+(CASE WHEN NOT flash AND NOT right_answer THEN 1 ELSE 0 END),next_streak,next_status,stamp)
    ON CONFLICT(user_id,lesson,word_id) DO UPDATE SET reviews=excluded.reviews,correct=excluded.correct,incorrect=excluded.incorrect,
      streak=excluded.streak,status=excluded.status,last_reviewed_at=excluded.last_reviewed_at;
  END LOOP;
  INSERT INTO public.activity_days VALUES(p_user_id,(stamp AT TIME ZONE 'Asia/Ho_Chi_Minh')::date) ON CONFLICT DO NOTHING;
  RETURN p_result;
END $$;
CREATE OR REPLACE FUNCTION public.save_exercise(p_user_id uuid,p_request jsonb,p_result jsonb) RETURNS jsonb
LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE prior public.essential_sessions%ROWTYPE; stamp timestamptz := (p_result->>'createdAt')::timestamptz;
BEGIN
  PERFORM 1 FROM public.profiles WHERE id=p_user_id AND NOT disabled FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'ACCOUNT_DISABLED'; END IF;
  SELECT * INTO prior FROM public.essential_sessions WHERE user_id=p_user_id AND id=p_request->>'id';
  IF FOUND THEN
    IF prior.request<>p_request THEN RAISE EXCEPTION 'REQUEST_CONFLICT'; END IF;
    IF public.progression_pending(p_user_id) THEN RAISE EXCEPTION 'PROGRESSION_BACKFILL_REQUIRED'; END IF;
    RETURN (prior.result-'rewardCalculation'-'progressionTotals'-'progressionChange') || (
      SELECT jsonb_build_object('reward',jsonb_build_object('exp',amount,'version',reward_version))
      FROM public.learning_exp_ledger WHERE user_id=p_user_id AND source_type='essential' AND source_id=prior.id);
  END IF;
  IF p_request->>'retryOf' IS NOT NULL AND NOT EXISTS(
    SELECT 1 FROM public.essential_sessions WHERE user_id=p_user_id AND unit=p_request->>'unitId' AND id=p_request->>'retryOf'
  ) THEN RAISE EXCEPTION 'RETRY_NOT_FOUND'; END IF;
  p_result := public.record_learning_reward(p_user_id,'essential',p_request->>'id',p_result);
  INSERT INTO public.essential_sessions(user_id,id,unit,request,result,created_at) VALUES(p_user_id,p_request->>'id',p_request->>'unitId',p_request,p_result-'progressionTotals',stamp);
  INSERT INTO public.activity_days VALUES(p_user_id,(stamp AT TIME ZONE 'Asia/Ho_Chi_Minh')::date) ON CONFLICT DO NOTHING;
  RETURN p_result;
END $$;
CREATE TABLE public.progression_backfills (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reward_version text NOT NULL,
  completed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(user_id,reward_version)
);
ALTER TABLE public.progression_backfills ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.progression_backfills FROM anon,authenticated;
GRANT ALL ON public.progression_backfills TO service_role;
CREATE FUNCTION public.backfill_learning_exp(p_user_id uuid,p_entries jsonb) RETURNS void
LANGUAGE plpgsql SET search_path='' AS $$
DECLARE entry jsonb; original jsonb; stamp timestamptz; previous public.learning_exp_ledger%ROWTYPE; calculation jsonb;
BEGIN
  PERFORM 1 FROM public.profiles WHERE id=p_user_id AND NOT disabled FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'ACCOUNT_DISABLED'; END IF;
  IF p_entries IS NULL OR jsonb_typeof(p_entries)<>'array' THEN RAISE EXCEPTION 'INVALID_HISTORY'; END IF;
  FOR entry IN SELECT value FROM jsonb_array_elements(p_entries) LOOP
    IF entry->>'sourceType'='vocabulary' THEN
      SELECT result,created_at INTO original,stamp FROM public.sessions WHERE user_id=p_user_id AND id=entry->>'sourceId';
    ELSIF entry->>'sourceType'='essential' THEN
      SELECT result,created_at INTO original,stamp FROM public.essential_sessions WHERE user_id=p_user_id AND id=entry->>'sourceId';
    ELSE RAISE EXCEPTION 'INVALID_HISTORY'; END IF;
    IF original IS NULL OR original IS DISTINCT FROM entry->'result' OR stamp IS DISTINCT FROM (entry->>'createdAt')::timestamptz THEN
      RAISE EXCEPTION 'HISTORY_CHANGED: %:%',entry->>'sourceType',entry->>'sourceId';
    END IF;
    calculation := entry->'calculation';
    PERFORM public.validate_learning_reward(calculation);
    SELECT * INTO previous FROM public.learning_exp_ledger WHERE user_id=p_user_id AND source_type=entry->>'sourceType' AND source_id=entry->>'sourceId';
    IF FOUND THEN
      IF previous.calculation IS DISTINCT FROM calculation OR previous.amount<>(calculation->>'exp')::bigint
        OR previous.reward_version IS DISTINCT FROM calculation->>'version' OR previous.created_at IS DISTINCT FROM stamp
      THEN RAISE EXCEPTION 'REWARD_CONFLICT: %:%',entry->>'sourceType',entry->>'sourceId'; END IF;
    ELSE
      INSERT INTO public.learning_exp_ledger(user_id,source_type,source_id,amount,reward_version,calculation,created_at)
        VALUES(p_user_id,entry->>'sourceType',entry->>'sourceId',(calculation->>'exp')::bigint,calculation->>'version',calculation,stamp);
    END IF;
  END LOOP;
  IF public.progression_pending(p_user_id) THEN RAISE EXCEPTION 'HISTORY_CHANGED: incomplete snapshot'; END IF;
  IF (SELECT coalesce(sum(amount),0) FROM public.learning_exp_ledger WHERE user_id=p_user_id)>9007199254740991 THEN RAISE EXCEPTION 'EXP_OVERFLOW'; END IF;
  INSERT INTO public.progression_backfills(user_id,reward_version) VALUES(p_user_id,'toeic-learning-v1') ON CONFLICT DO NOTHING;
END $$;
REVOKE ALL ON FUNCTION public.backfill_learning_exp(uuid,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.backfill_learning_exp(uuid,jsonb) TO service_role;
COMMIT;
