-- ETS history is deliberately independent of progression, rewards and activity days.
CREATE TABLE public.ets_sessions (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  id text NOT NULL,
  test_id integer NOT NULL CHECK(test_id BETWEEN 1 AND 10),
  part integer NOT NULL CHECK(part BETWEEN 0 AND 7),
  request jsonb NOT NULL,
  result jsonb NOT NULL,
  created_at timestamptz NOT NULL,
  PRIMARY KEY(user_id,id)
);
CREATE INDEX ets_scope_date ON public.ets_sessions(user_id,test_id,part,created_at DESC,id);
ALTER TABLE public.ets_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_ets_results ON public.ets_sessions FOR SELECT TO authenticated
USING(user_id=(SELECT auth.uid()) AND (SELECT public.is_active_user()));
REVOKE ALL ON public.ets_sessions FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.ets_sessions TO authenticated;
GRANT SELECT,INSERT ON public.ets_sessions TO service_role;

CREATE FUNCTION public.save_ets(p_user_id uuid,p_request jsonb,p_result jsonb) RETURNS jsonb
LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE prior public.ets_sessions%ROWTYPE;
BEGIN
  -- Serialize concurrent retries and coordinate account disabling.
  PERFORM 1 FROM public.profiles WHERE id=p_user_id AND NOT disabled FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'ACCOUNT_DISABLED'; END IF;
  SELECT * INTO prior FROM public.ets_sessions WHERE user_id=p_user_id AND id=p_request->>'id';
  IF FOUND THEN
    IF prior.request<>p_request THEN RAISE EXCEPTION 'REQUEST_CONFLICT'; END IF;
    RETURN prior.result;
  END IF;
  INSERT INTO public.ets_sessions(user_id,id,test_id,part,request,result,created_at)
  VALUES(p_user_id,p_request->>'id',(p_request->>'testId')::integer,(p_request->>'part')::integer,p_request,p_result,(p_result->>'createdAt')::timestamptz);
  RETURN p_result;
END $$;
REVOKE ALL ON FUNCTION public.save_ets(uuid,jsonb,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.save_ets(uuid,jsonb,jsonb) TO service_role;
