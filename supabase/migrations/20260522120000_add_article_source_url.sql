-- Optional source URL for news articles (link to original newspaper/news source)
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS source_url TEXT;
