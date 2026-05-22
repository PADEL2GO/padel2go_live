import { useState } from "react";
import { motion } from "framer-motion";
import { CalendarDays, ChevronDown, ChevronUp } from "lucide-react";
import { format, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Article } from "@/types/article";

export function ArticleCard({ article }: { article: Article }) {
  const [expanded, setExpanded] = useState(false);

  const dateLabel = article.published_at
    ? format(parseISO(article.published_at), "d. MMMM yyyy", { locale: de })
    : null;

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="overflow-hidden">
        {article.cover_image_url && (
          <div className="aspect-[16/7] w-full overflow-hidden bg-muted">
            <img
              src={article.cover_image_url}
              alt={article.title}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          </div>
        )}
        <div className="p-5 space-y-3">
          {dateLabel && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CalendarDays className="h-3.5 w-3.5" />
              {dateLabel}
            </div>
          )}
          <h3 className="text-lg font-bold leading-tight text-foreground">{article.title}</h3>

          {article.excerpt && (
            <p className="text-sm text-muted-foreground">{article.excerpt}</p>
          )}

          {expanded && article.body_html && (
            <div
              className="prose prose-sm dark:prose-invert max-w-none pt-1"
              dangerouslySetInnerHTML={{ __html: article.body_html }}
            />
          )}

          {article.body_html?.trim() && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-primary hover:text-primary"
              onClick={() => setExpanded((v) => !v)}
            >
              {expanded ? (
                <>
                  Weniger anzeigen <ChevronUp className="ml-1 h-4 w-4" />
                </>
              ) : (
                <>
                  Artikel lesen <ChevronDown className="ml-1 h-4 w-4" />
                </>
              )}
            </Button>
          )}
        </div>
      </Card>
    </motion.div>
  );
}
