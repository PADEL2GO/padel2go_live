-- Seed the anthropic integration slot for the AI article generator (generate-article edge fn)
INSERT INTO public.site_integration_configs (service) VALUES ('anthropic')
ON CONFLICT (service) DO NOTHING;
