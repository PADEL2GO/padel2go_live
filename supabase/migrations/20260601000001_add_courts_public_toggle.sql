-- Global "show online courts to users" toggle on site_settings.
-- When false (default): only admins see bookable courts. Public visitors and
-- non-admin logged-in users see a "Bald verfügbar" screen on the booking pages.
-- When true: all users see online courts normally.
ALTER TABLE site_settings
  ADD COLUMN IF NOT EXISTS feature_courts_public_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS feature_courts_public_updated_at timestamptz;
