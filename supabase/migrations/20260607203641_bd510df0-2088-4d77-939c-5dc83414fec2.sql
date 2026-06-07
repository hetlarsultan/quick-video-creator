
-- 1) veo_rate_limits (server-only)
CREATE TABLE public.veo_rate_limits (
  id BIGSERIAL PRIMARY KEY,
  client_id TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX veo_rate_limits_client_time_idx ON public.veo_rate_limits(client_id, started_at DESC);
GRANT ALL ON public.veo_rate_limits TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.veo_rate_limits_id_seq TO service_role;
ALTER TABLE public.veo_rate_limits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service role only" ON public.veo_rate_limits FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 2) veo_events (client-visible log)
CREATE TABLE public.veo_events (
  id BIGSERIAL PRIMARY KEY,
  client_id TEXT NOT NULL,
  project_id TEXT,
  kind TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX veo_events_client_time_idx ON public.veo_events(client_id, created_at DESC);
GRANT SELECT, INSERT ON public.veo_events TO anon, authenticated;
GRANT ALL ON public.veo_events TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.veo_events_id_seq TO anon, authenticated, service_role;
ALTER TABLE public.veo_events ENABLE ROW LEVEL SECURITY;
-- Anyone may insert; reads are not user-scoped server-side because there's no auth,
-- but we keep them readable so the client can filter by its own client_id.
CREATE POLICY "anyone can insert veo events" ON public.veo_events
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anyone can read veo events" ON public.veo_events
  FOR SELECT TO anon, authenticated USING (true);
