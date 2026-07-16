
CREATE TABLE public.mcp_call_logs (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id text,
  tool_name text NOT NULL,
  status text NOT NULL,
  duration_ms integer,
  error text,
  input jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.mcp_call_logs TO authenticated;
GRANT ALL ON public.mcp_call_logs TO service_role;
ALTER TABLE public.mcp_call_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own mcp logs" ON public.mcp_call_logs FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE INDEX mcp_call_logs_user_created_idx ON public.mcp_call_logs (user_id, created_at DESC);

CREATE TABLE public.mcp_rate_limits (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL,
  tool_name text NOT NULL,
  called_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.mcp_rate_limits TO service_role;
ALTER TABLE public.mcp_rate_limits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service only mcp rl" ON public.mcp_rate_limits FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE INDEX mcp_rate_limits_user_tool_time_idx ON public.mcp_rate_limits (user_id, tool_name, called_at DESC);
