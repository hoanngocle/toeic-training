BEGIN;
CREATE TABLE public.legacy_imports (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  fingerprint text NOT NULL, imported_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.legacy_imports ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.legacy_imports FROM anon,authenticated;
GRANT ALL ON public.legacy_imports TO service_role;
CREATE FUNCTION public.import_legacy_learning(p_user_id uuid,p_snapshot jsonb,p_fingerprint text) RETURNS jsonb
LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE previous text;
BEGIN
  PERFORM 1 FROM public.profiles WHERE id=p_user_id AND role='admin' AND NOT disabled FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'ADMIN_TARGET_REQUIRED'; END IF;
  IF p_fingerprint !~ '^[a-f0-9]{64}$' THEN RAISE EXCEPTION 'INVALID_FINGERPRINT'; END IF;
  SELECT fingerprint INTO previous FROM public.legacy_imports WHERE user_id=p_user_id;
  IF FOUND THEN
    IF previous=p_fingerprint THEN RETURN jsonb_build_object('alreadyImported',true); END IF;
    RAISE EXCEPTION 'IMPORT_CONFLICT';
  END IF;
  IF EXISTS(SELECT 1 FROM public.sessions WHERE user_id=p_user_id)
    OR EXISTS(SELECT 1 FROM public.essential_sessions WHERE user_id=p_user_id)
    OR EXISTS(SELECT 1 FROM public.progress WHERE user_id=p_user_id)
    OR EXISTS(SELECT 1 FROM public.activity_days WHERE user_id=p_user_id)
    OR EXISTS(SELECT 1 FROM public.achievement_awards WHERE user_id=p_user_id)
  THEN RAISE EXCEPTION 'IMPORT_CONFLICT: target already has learning data'; END IF;
  INSERT INTO public.sessions(user_id,id,lesson,mode,created_at,request,result)
    SELECT p_user_id,id,lesson,mode,created_at,request,result FROM jsonb_to_recordset(p_snapshot->'sessions')
    AS x(id text,lesson text,mode text,created_at timestamptz,request jsonb,result jsonb,sequence bigint) ORDER BY created_at,sequence;
  INSERT INTO public.progress(user_id,lesson,word_id,reviews,correct,incorrect,streak,status,last_reviewed_at)
    SELECT p_user_id,lesson,word_id,reviews,correct,incorrect,streak,status,last_reviewed_at FROM jsonb_to_recordset(p_snapshot->'progress')
    AS x(lesson text,word_id integer,reviews integer,correct integer,incorrect integer,streak integer,status text,last_reviewed_at timestamptz);
  INSERT INTO public.essential_sessions(user_id,id,unit,request,result,created_at)
    SELECT p_user_id,id,unit,request,result,created_at FROM jsonb_to_recordset(p_snapshot->'essential_sessions')
    AS x(id text,unit text,request jsonb,result jsonb,created_at timestamptz,sequence bigint) ORDER BY created_at,sequence;
  INSERT INTO public.activity_days(user_id,day)
    SELECT p_user_id,day FROM jsonb_to_recordset(p_snapshot->'activity_days') AS x(day date);
  INSERT INTO public.activity_days(user_id,day)
    SELECT p_user_id,(created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date FROM public.sessions WHERE user_id=p_user_id
    UNION SELECT p_user_id,(created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date FROM public.essential_sessions WHERE user_id=p_user_id
    ON CONFLICT DO NOTHING;
  INSERT INTO public.achievement_awards(user_id,id,earned_day)
    SELECT p_user_id,id,earned_day FROM jsonb_to_recordset(p_snapshot->'achievement_awards') AS x(id text,earned_day date);
  INSERT INTO public.legacy_imports(user_id,fingerprint) VALUES(p_user_id,p_fingerprint);
  RETURN jsonb_build_object('alreadyImported',false);
END $$;
REVOKE ALL ON FUNCTION public.import_legacy_learning(uuid,jsonb,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.import_legacy_learning(uuid,jsonb,text) TO service_role;
COMMIT;
