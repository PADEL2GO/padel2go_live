import { Newspaper } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useArticles } from "@/hooks/useArticles";
import { ArticleCard } from "./ArticleCard";

interface ArticleFeedProps {
  /** "logged_in" → dashboard Übersicht, "logged_out" → public home */
  surface: "logged_in" | "logged_out";
  /** "public" wraps the feed in a page section with a container; "dashboard" renders bare */
  placement: "public" | "dashboard";
}

export function ArticleFeed({ surface, placement }: ArticleFeedProps) {
  const { t } = useTranslation("common");
  const { data: articles = [], isLoading } = useArticles(surface);

  // Render nothing while loading or when there's no news — avoid an empty section.
  if (isLoading || articles.length === 0) return null;

  const heading = (
    <div className="flex items-center gap-2">
      <Newspaper className="h-5 w-5 text-primary" />
      <h2 className="text-xl font-bold text-foreground">{t("latestNews")}</h2>
    </div>
  );

  const list = (
    <div className="space-y-5">
      {articles.map((article) => (
        <ArticleCard key={article.id} article={article} />
      ))}
    </div>
  );

  if (placement === "public") {
    return (
      <section className="py-12 md:py-16 bg-background">
        <div className="container mx-auto px-4 space-y-6">
          {heading}
          {list}
        </div>
      </section>
    );
  }

  return (
    <div className="space-y-4">
      {heading}
      {list}
    </div>
  );
}
