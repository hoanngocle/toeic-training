BEGIN;
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'learner' CHECK (role IN ('admin','learner')),
  disabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE FUNCTION public.create_profile() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  INSERT INTO public.profiles(id,email) VALUES (NEW.id,coalesce(NEW.email,''));
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.create_profile() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.create_profile();
-- Also handles a user created in the dashboard before applying the migration.
INSERT INTO public.profiles(id,email) SELECT id,coalesce(email,'') FROM auth.users ON CONFLICT DO NOTHING;

CREATE TABLE public.sessions (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sequence bigint GENERATED ALWAYS AS IDENTITY,
  id text NOT NULL, lesson text NOT NULL, mode text NOT NULL CHECK (mode IN ('flashcard','writing','test')),
  created_at timestamptz NOT NULL, request jsonb NOT NULL, result jsonb NOT NULL,
  PRIMARY KEY(user_id,id)
);
CREATE INDEX sessions_lesson_date ON public.sessions(user_id,lesson,created_at DESC,id);
CREATE TABLE public.progress (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  lesson text NOT NULL, word_id integer NOT NULL,
  reviews integer NOT NULL DEFAULT 0, correct integer NOT NULL DEFAULT 0, incorrect integer NOT NULL DEFAULT 0,
  streak integer NOT NULL DEFAULT 0, status text NOT NULL CHECK(status IN ('learning','learned')),
  last_reviewed_at timestamptz NOT NULL,
  PRIMARY KEY(user_id,lesson,word_id)
);
CREATE TABLE public.essential_sessions (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sequence bigint GENERATED ALWAYS AS IDENTITY,
  id text NOT NULL, unit text NOT NULL, request jsonb NOT NULL, result jsonb NOT NULL, created_at timestamptz NOT NULL,
  PRIMARY KEY(user_id,id)
);
CREATE INDEX essential_unit_date ON public.essential_sessions(user_id,unit,created_at DESC,id);
CREATE TABLE public.activity_days (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  day date NOT NULL, PRIMARY KEY(user_id,day)
);
CREATE FUNCTION public.is_active_user() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id=(SELECT auth.uid()) AND NOT disabled)
$$;
REVOKE ALL ON FUNCTION public.is_active_user() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_active_user() TO authenticated,service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_profile ON public.profiles FOR SELECT TO authenticated USING(id=(SELECT auth.uid()));
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.essential_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_days ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_sessions ON public.sessions FOR SELECT TO authenticated USING(user_id=(SELECT auth.uid()) AND (SELECT public.is_active_user()));
CREATE POLICY own_progress ON public.progress FOR SELECT TO authenticated USING(user_id=(SELECT auth.uid()) AND (SELECT public.is_active_user()));
CREATE POLICY own_exercises ON public.essential_sessions FOR SELECT TO authenticated USING(user_id=(SELECT auth.uid()) AND (SELECT public.is_active_user()));
CREATE POLICY own_days ON public.activity_days FOR SELECT TO authenticated USING(user_id=(SELECT auth.uid()) AND (SELECT public.is_active_user()));
REVOKE ALL ON public.profiles,public.sessions,public.progress,public.essential_sessions,public.activity_days FROM anon,authenticated;
GRANT SELECT ON public.profiles,public.sessions,public.progress,public.essential_sessions,public.activity_days TO authenticated;
GRANT ALL ON public.profiles,public.sessions,public.progress,public.essential_sessions,public.activity_days TO service_role;

-- Profile row lock serializes saves for a person and coordinates with account locking.
CREATE FUNCTION public.save_learning(p_user_id uuid,p_request jsonb,p_result jsonb) RETURNS jsonb
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
    RETURN prior.result;
  END IF;
  IF p_request->>'retryOf' IS NOT NULL THEN
    SELECT * INTO prior FROM public.sessions WHERE user_id=p_user_id AND lesson=lesson_id AND mode='test' AND id=p_request->>'retryOf';
    IF NOT FOUND THEN RAISE EXCEPTION 'RETRY_NOT_FOUND'; END IF;
    IF (SELECT coalesce(jsonb_agg((value->>'wordId')::integer ORDER BY (value->>'wordId')::integer),'[]'::jsonb) FROM jsonb_array_elements(prior.result->'results') WHERE NOT (value->>'correct')::boolean)
       <> (SELECT jsonb_agg((value->>'wordId')::integer ORDER BY (value->>'wordId')::integer) FROM jsonb_array_elements(p_request->'answers'))
    THEN RAISE EXCEPTION 'RETRY_NOT_FOUND'; END IF;
  END IF;
  INSERT INTO public.sessions(user_id,id,lesson,mode,created_at,request,result) VALUES(p_user_id,p_request->>'id',lesson_id,p_request->>'mode',stamp,p_request,p_result);
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
CREATE FUNCTION public.save_exercise(p_user_id uuid,p_request jsonb,p_result jsonb) RETURNS jsonb
LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE prior public.essential_sessions%ROWTYPE; stamp timestamptz := (p_result->>'createdAt')::timestamptz;
BEGIN
  PERFORM 1 FROM public.profiles WHERE id=p_user_id AND NOT disabled FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'ACCOUNT_DISABLED'; END IF;
  SELECT * INTO prior FROM public.essential_sessions WHERE user_id=p_user_id AND id=p_request->>'id';
  IF FOUND THEN
    IF prior.request<>p_request THEN RAISE EXCEPTION 'REQUEST_CONFLICT'; END IF;
    RETURN prior.result;
  END IF;
  IF p_request->>'retryOf' IS NOT NULL AND NOT EXISTS(
    SELECT 1 FROM public.essential_sessions WHERE user_id=p_user_id AND unit=p_request->>'unitId' AND id=p_request->>'retryOf'
  ) THEN RAISE EXCEPTION 'RETRY_NOT_FOUND'; END IF;
  INSERT INTO public.essential_sessions(user_id,id,unit,request,result,created_at) VALUES(p_user_id,p_request->>'id',p_request->>'unitId',p_request,p_result,stamp);
  INSERT INTO public.activity_days VALUES(p_user_id,(stamp AT TIME ZONE 'Asia/Ho_Chi_Minh')::date) ON CONFLICT DO NOTHING;
  RETURN p_result;
END $$;
REVOKE ALL ON FUNCTION public.save_learning(uuid,jsonb,jsonb),public.save_exercise(uuid,jsonb,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.save_learning(uuid,jsonb,jsonb),public.save_exercise(uuid,jsonb,jsonb) TO service_role;
CREATE TABLE public.achievement_awards (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  id text NOT NULL, earned_day date NOT NULL, PRIMARY KEY(user_id,id)
);
ALTER TABLE public.achievement_awards ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_awards ON public.achievement_awards FOR SELECT TO authenticated USING(user_id=(SELECT auth.uid()) AND (SELECT public.is_active_user()));
REVOKE ALL ON public.achievement_awards FROM anon,authenticated;
GRANT SELECT ON public.achievement_awards TO authenticated;
GRANT ALL ON public.achievement_awards TO service_role;
GRANT USAGE,SELECT ON SEQUENCE public.sessions_sequence_seq,public.essential_sessions_sequence_seq TO service_role;
CREATE FUNCTION public.record_awards(p_user_id uuid,p_awards jsonb) RETURNS void LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  PERFORM 1 FROM public.profiles WHERE id=p_user_id AND NOT disabled FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'ACCOUNT_DISABLED'; END IF;
  INSERT INTO public.achievement_awards(user_id,id,earned_day)
    SELECT p_user_id,key,value::date FROM jsonb_each_text(p_awards)
    ON CONFLICT(user_id,id) DO UPDATE SET earned_day=least(public.achievement_awards.earned_day,excluded.earned_day);
END $$;
REVOKE ALL ON FUNCTION public.record_awards(uuid,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.record_awards(uuid,jsonb) TO service_role;
COMMIT;
