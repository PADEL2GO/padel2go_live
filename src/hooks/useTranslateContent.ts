import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface TranslateRowOptions {
  table: string;
  id: string;
  fields: string[];
}

interface TranslateRowResult {
  row: Record<string, unknown> | null;
  updatedFields: string[];
  skipped: string[];
}

/**
 * Calls the `translate-content` Edge Function after the admin has saved
 * a row. The function reads the German values from the row, translates
 * the ones that are not locked, and writes the English values back.
 */
export const useTranslateContent = () => {
  const [isTranslating, setIsTranslating] = useState(false);

  const translateRow = async ({
    table,
    id,
    fields,
  }: TranslateRowOptions): Promise<TranslateRowResult | null> => {
    setIsTranslating(true);
    try {
      const { data, error } = await supabase.functions.invoke<TranslateRowResult>(
        "translate-content",
        { body: { table, id, fields } },
      );
      if (error) {
        console.error("translate-content invoke error", error);
        return null;
      }
      return data ?? null;
    } catch (err) {
      console.error("translate-content threw", err);
      return null;
    } finally {
      setIsTranslating(false);
    }
  };

  const translateText = async (text: string): Promise<string | null> => {
    if (!text?.trim()) return null;
    setIsTranslating(true);
    try {
      const { data, error } = await supabase.functions.invoke<{ translated: string }>(
        "translate-content",
        { body: { text } },
      );
      if (error) return null;
      return data?.translated ?? null;
    } finally {
      setIsTranslating(false);
    }
  };

  return { translateRow, translateText, isTranslating };
};
