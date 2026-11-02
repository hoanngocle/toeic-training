BEGIN;
-- Keep legacy grants and historical backfills valid without retroactive bonuses.
ALTER FUNCTION public.validate_learning_reward(jsonb) RENAME TO validate_learning_reward_v1;
CREATE FUNCTION public.validate_learning_reward(p_calculation jsonb) RETURNS void
LANGUAGE plpgsql SET search_path='' AS $$
DECLARE percent numeric; base_exp numeric; bonus_exp numeric; final_exp numeric;
BEGIN
  IF p_calculation->>'version' IS NOT DISTINCT FROM 'toeic-learning-v1' THEN
    PERFORM public.validate_learning_reward_v1(p_calculation);
    RETURN;
  END IF;
  IF p_calculation IS NULL OR jsonb_typeof(p_calculation)<>'object'
    OR p_calculation->>'version' IS DISTINCT FROM 'toeic-learning-badges-v2'
    OR jsonb_typeof(p_calculation->'baseExp') IS DISTINCT FROM 'number'
    OR jsonb_typeof(p_calculation->'badgeBonusPercent') IS DISTINCT FROM 'number'
    OR jsonb_typeof(p_calculation->'bonusExp') IS DISTINCT FROM 'number'
    OR jsonb_typeof(p_calculation->'exp') IS DISTINCT FROM 'number'
  THEN RAISE EXCEPTION 'INVALID_REWARD'; END IF;
  percent := (p_calculation->>'badgeBonusPercent')::numeric;
  base_exp := (p_calculation->>'baseExp')::numeric;
  bonus_exp := (p_calculation->>'bonusExp')::numeric;
  final_exp := (p_calculation->>'exp')::numeric;
  PERFORM public.validate_learning_reward_v1(
    (p_calculation-'baseExp'-'badgeBonusPercent'-'bonusExp') || jsonb_build_object('version','toeic-learning-v1','exp',base_exp));
  IF percent < 0 OR percent*2 > 9007199254740991 OR trunc(percent*2)<>percent*2
    OR bonus_exp <> floor(base_exp*percent/100)
    OR final_exp <> base_exp+bonus_exp OR final_exp > 9007199254740991
  THEN RAISE EXCEPTION 'INVALID_REWARD'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.validate_learning_reward(jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.validate_learning_reward(jsonb) TO service_role;

CREATE FUNCTION public.learning_reward_receipt(p_calculation jsonb) RETURNS jsonb
LANGUAGE sql IMMUTABLE SET search_path='' AS $$
  SELECT jsonb_strip_nulls(jsonb_build_object(
    'exp',p_calculation->'exp','version',p_calculation->'version',
    'baseExp',p_calculation->'baseExp','badgeBonusPercent',p_calculation->'badgeBonusPercent','bonusExp',p_calculation->'bonusExp'))
$$;
REVOKE ALL ON FUNCTION public.learning_reward_receipt(jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.learning_reward_receipt(jsonb) TO service_role;


-- Preserve the same receipt for initial saves and retries.
CREATE OR REPLACE FUNCTION public.record_learning_reward(p_user_id uuid,p_source_type text,p_source_id text,p_result jsonb) RETURNS jsonb
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
    jsonb_build_object('reward',public.learning_reward_receipt(calculation),
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
      SELECT jsonb_build_object('reward',public.learning_reward_receipt(calculation))
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
      SELECT jsonb_build_object('reward',public.learning_reward_receipt(calculation))
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
COMMIT;
