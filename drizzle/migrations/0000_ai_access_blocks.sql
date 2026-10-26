CREATE TABLE public.ai_access_blocks (scope text PRIMARY KEY, kind text NOT NULL, status integer NOT NULL, message text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
GRANT ALL ON public.ai_access_blocks TO service_role;
ALTER TABLE public.ai_access_blocks ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.ai_access_blocks IS 'Server-only persistent AI access circuit breakers. Clear only after provider access is restored.';