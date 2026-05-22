export type ArticleAudience = "logged_in" | "logged_out" | "everyone";

export interface Article {
  id: string;
  title: string;
  excerpt: string | null;
  body_html: string;
  cover_image_url: string | null;
  source_url: string | null;
  audience: ArticleAudience;
  is_published: boolean;
  published_at: string | null;
  sort_order: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export const AUDIENCE_LABELS: Record<ArticleAudience, string> = {
  everyone: "Alle",
  logged_in: "Nur eingeloggte Nutzer",
  logged_out: "Nur Besucher (nicht eingeloggt)",
};
