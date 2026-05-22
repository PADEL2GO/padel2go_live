import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Article } from "@/types/article";

/**
 * Public read hook for the news feed.
 * `surface` "logged_in" → dashboard Übersicht, "logged_out" → public home.
 * Returns published articles targeted at that surface plus "everyone" articles.
 */
export function useArticles(surface: "logged_in" | "logged_out") {
  return useQuery({
    queryKey: ["articles", surface],
    queryFn: async (): Promise<Article[]> => {
      const { data, error } = await (supabase as any)
        .from("articles")
        .select("*")
        .eq("is_published", true)
        .in("audience", [surface, "everyone"])
        .order("sort_order", { ascending: false })
        .order("published_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Article[];
    },
  });
}
