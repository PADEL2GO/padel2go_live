-- QR landing page sections
-- Backs the /qr page (linked from Florian's business card QR code) and
-- the /admin/qr-panel editor. One row per section, holds DE + EN texts
-- and DE + EN PDF URLs. Translation columns + locks match the Phase 3
-- auto-translate pattern (DeepL fills *_en unless *_en_locked = true).

CREATE TABLE IF NOT EXISTS public.qr_sections (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                     text NOT NULL UNIQUE,
  sort_order               integer NOT NULL DEFAULT 0,
  is_visible               boolean NOT NULL DEFAULT true,

  title                    text NOT NULL,
  title_en                 text,
  title_en_locked          boolean NOT NULL DEFAULT false,

  description              text,
  description_en           text,
  description_en_locked    boolean NOT NULL DEFAULT false,

  file_de_url              text,
  file_de_name             text,
  file_de_size_bytes       integer,
  file_en_url              text,
  file_en_name             text,
  file_en_size_bytes       integer,

  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS qr_sections_sort_idx
  ON public.qr_sections (sort_order, created_at);

ALTER TABLE public.qr_sections ENABLE ROW LEVEL SECURITY;

-- Anyone can SELECT visible sections; admins always see everything
DROP POLICY IF EXISTS "Anyone can view visible qr sections" ON public.qr_sections;
CREATE POLICY "Anyone can view visible qr sections"
  ON public.qr_sections
  FOR SELECT
  USING (is_visible = true OR public.has_role(auth.uid(), 'admin'::app_role));

-- Only admins can write
DROP POLICY IF EXISTS "Admins manage qr sections" ON public.qr_sections;
CREATE POLICY "Admins manage qr sections"
  ON public.qr_sections
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- updated_at trigger (reuses the global helper that already exists in the schema)
DROP TRIGGER IF EXISTS update_qr_sections_updated_at ON public.qr_sections;
CREATE TRIGGER update_qr_sections_updated_at
  BEFORE UPDATE ON public.qr_sections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed three starter sections so the page is not empty on first open
INSERT INTO public.qr_sections (slug, sort_order, title, description)
VALUES
  (
    'fuer-vereine',
    0,
    'Für Vereine',
    'Vereins-Teaser zum Mitnehmen — der schnelle Überblick, wie PADEL2GO eure Tennisflächen ohne Investment in Padel-Courts verwandelt.'
  ),
  (
    'fuer-investoren',
    1,
    'Für Investoren',
    'Pitch und weiterführende Unterlagen zum Investment in PADEL2GO: Marktgröße, Geschäftsmodell, Roadmap und Team.'
  ),
  (
    'marketing-partner',
    2,
    'Für Marketing-Partner',
    'Marketing-Präsentation mit Touchpoints, Reichweiten, Aktivierungsoptionen und Cases für Marken- und Produktpartner.'
  )
ON CONFLICT (slug) DO NOTHING;
