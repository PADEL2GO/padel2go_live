-- EN translations for admin-managed content surfaced on public pages.
-- Each translatable text field gets a sibling *_en value and a *_en_locked
-- boolean. The auto-translate Edge Function regenerates *_en on every save
-- UNLESS *_en_locked = true, in which case the admin's manual EN override
-- is preserved.

-- partner_tiles: name stays untranslated (brand), description gets EN
ALTER TABLE public.partner_tiles
  ADD COLUMN IF NOT EXISTS description_en text,
  ADD COLUMN IF NOT EXISTS description_en_locked boolean NOT NULL DEFAULT false;

-- location_teasers: title, description, city, expected_date all translatable
ALTER TABLE public.location_teasers
  ADD COLUMN IF NOT EXISTS title_en text,
  ADD COLUMN IF NOT EXISTS title_en_locked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS description_en text,
  ADD COLUMN IF NOT EXISTS description_en_locked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS city_en text,
  ADD COLUMN IF NOT EXISTS city_en_locked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS expected_date_en text,
  ADD COLUMN IF NOT EXISTS expected_date_en_locked boolean NOT NULL DEFAULT false;

-- skypadel_gallery: only alt_text is user-visible
ALTER TABLE public.skypadel_gallery
  ADD COLUMN IF NOT EXISTS alt_text_en text,
  ADD COLUMN IF NOT EXISTS alt_text_en_locked boolean NOT NULL DEFAULT false;

-- partner_touchpoint_slides: title + description
ALTER TABLE public.partner_touchpoint_slides
  ADD COLUMN IF NOT EXISTS title_en text,
  ADD COLUMN IF NOT EXISTS title_en_locked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS description_en text,
  ADD COLUMN IF NOT EXISTS description_en_locked boolean NOT NULL DEFAULT false;

-- Seed an empty 'deepl' row in site_integration_configs so the admin
-- integrations UI can manage the DeepL API key just like Stripe/Resend/etc.
-- The Edge Function reads Deno.env.get("DEEPL_API_KEY") first and falls
-- back to this row, mirroring the existing integration pattern.
INSERT INTO site_integration_configs (service) VALUES ('deepl')
  ON CONFLICT (service) DO NOTHING;
