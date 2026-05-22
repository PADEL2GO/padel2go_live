-- News / Articles CMS table
CREATE TABLE IF NOT EXISTS public.articles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT NOT NULL,
  excerpt         TEXT,
  body_html       TEXT NOT NULL DEFAULT '',
  cover_image_url TEXT,
  audience        TEXT NOT NULL DEFAULT 'everyone'
                  CHECK (audience IN ('logged_in', 'logged_out', 'everyone')),
  is_published    BOOLEAN NOT NULL DEFAULT false,
  published_at    TIMESTAMPTZ,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_by      UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_articles_published
  ON public.articles (is_published, published_at DESC);

ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;

-- Anyone (including anonymous visitors) can read published articles
DROP POLICY IF EXISTS "Anyone reads published articles" ON public.articles;
CREATE POLICY "Anyone reads published articles"
  ON public.articles FOR SELECT
  USING (is_published = true);

-- Admins can read everything, including drafts
DROP POLICY IF EXISTS "Admins read all articles" ON public.articles;
CREATE POLICY "Admins read all articles"
  ON public.articles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Admins can insert / update / delete
DROP POLICY IF EXISTS "Admins write articles" ON public.articles;
CREATE POLICY "Admins write articles"
  ON public.articles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
