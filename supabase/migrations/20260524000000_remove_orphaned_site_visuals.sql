-- ============================================================
-- Remove orphaned site_visuals — keys still in DB but with no
-- consumer in the frontend (verified 2026-05-24).
-- Once deleted, they disappear from /admin/visuals automatically
-- because the admin panel reads the list dynamically.
-- ============================================================

DELETE FROM public.site_visuals WHERE key IN (
  -- Für Vereine → Digitales Ökosystem (no <SiteVisual visualKey=…> in FuerVereine.tsx)
  'fuer-vereine.oekosystem.app-booking',
  'fuer-vereine.oekosystem.score-tracking',
  'fuer-vereine.oekosystem.league-circuit',
  'fuer-vereine.oekosystem.loyalty-rewards',
  -- Für Vereine → KI-Kamera (key not referenced anywhere in src/)
  'fuer-vereine.ki-kamera',
  -- Für Spieler → KI-Kamera 2nd demo video (VideoEmbed component exists
  -- but is never instantiated with this key in FuerSpieler.tsx)
  'fuer-spieler.ki.video-2'
);
