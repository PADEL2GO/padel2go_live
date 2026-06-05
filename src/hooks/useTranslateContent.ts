import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TranslateRowOptions {
  table: string;
  id: string;
  fields: string[];
}

interface TranslateRowResult {
  row: Record<string, unknown> | null;
  updatedFields: string[];
  skipped: string[];
  /** Set when the invoke failed; UI can show the actual reason. */
  error?: string;
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
  }: TranslateRowOptions): Promise<TranslateRowResult> => {
    setIsTranslating(true);
    try {
      const { data, error } = await supabase.functions.invoke<TranslateRowResult>(
        "translate-content",
        { body: { table, id, fields } },
      );
      if (error) {
        // supabase-js wraps the response; try to surface the function's own
        // error body so the UI can show it instead of a generic message
        let detail = error.message || "Unknown error";
        const ctx = (error as { context?: Response }).context;
        if (ctx && typeof ctx.json === "function") {
          try {
            const body = await ctx.json();
            if (body?.error) detail = String(body.error);
          } catch {
            /* response not JSON */
          }
        }
        console.error("translate-content invoke error", detail, error);
        return { row: null, updatedFields: [], skipped: [], error: detail };
      }
      return data ?? { row: null, updatedFields: [], skipped: [] };
    } catch (err) {
      const detail = (err as Error)?.message ?? String(err);
      console.error("translate-content threw", err);
      return { row: null, updatedFields: [], skipped: [], error: detail };
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

/**
 * Shows the right toast based on a translateRow result. Surfaces the
 * actual Edge Function error when something went wrong, instead of a
 * generic "DeepL not configured" line that hides real bugs.
 */
export const toastTranslateResult = (result: TranslateRowResult): void => {
  if (result.error) {
    const err = result.error.toLowerCase();
    if (err.includes("deepl api key") || err.includes("not configured")) {
      toast.error("DeepL nicht konfiguriert — EN-Felder bleiben leer. Im Admin → Integrationen einrichten.");
    } else if (err.includes("not registered for translation")) {
      toast.error("Übersetzung fehlgeschlagen: Edge Function ist veraltet. Neu deployen: supabase functions deploy translate-content");
    } else {
      toast.error(`Übersetzung fehlgeschlagen: ${result.error}`);
    }
    return;
  }
  if (result.updatedFields.length > 0) {
    toast.success("Übersetzung aktualisiert");
    return;
  }
  if (result.skipped.length > 0) {
    toast.info("Manuell gesperrt — nicht überschrieben");
  }
};
