import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type QrLang = "de" | "en";

export interface QrSection {
  id: string;
  slug: string;
  sort_order: number;
  is_visible: boolean;
  title: string;
  title_en: string | null;
  title_en_locked: boolean;
  description: string | null;
  description_en: string | null;
  description_en_locked: boolean;
  file_de_url: string | null;
  file_de_name: string | null;
  file_de_size_bytes: number | null;
  file_en_url: string | null;
  file_en_name: string | null;
  file_en_size_bytes: number | null;
  created_at: string;
  updated_at: string;
}

const STORAGE_BUCKET = "media";
const STORAGE_PREFIX = "qr-panel";
const MAX_FILE_BYTES = 25 * 1024 * 1024; // 25 MB
const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
]);

const slugify = (input: string): string =>
  input
    .toLowerCase()
    .replace(/[äÄ]/g, "ae")
    .replace(/[öÖ]/g, "oe")
    .replace(/[üÜ]/g, "ue")
    .replace(/[ß]/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);

const QUERY_KEY = ["qr-sections"] as const;

export const validateFile = (
  file: File,
): { ok: true } | { ok: false; reason: string } => {
  if (file.size > MAX_FILE_BYTES) {
    return { ok: false, reason: `Datei ist zu groß (max. 25 MB).` };
  }
  if (!ALLOWED_MIME.has(file.type)) {
    return {
      ok: false,
      reason: "Nur PDF / PNG / JPG / WEBP erlaubt.",
    };
  }
  return { ok: true };
};

export const uploadQrFile = async (
  section: QrSection,
  lang: QrLang,
  file: File,
): Promise<{ url: string; storagePath: string; name: string; size: number }> => {
  const v = validateFile(file);
  if (!v.ok) throw new Error(v.reason);

  const ext = (file.name.split(".").pop() || "pdf").toLowerCase();
  const path = `${STORAGE_PREFIX}/${section.slug}/${lang}-${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type });
  if (uploadError) throw uploadError;

  const { data: urlData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  return {
    url: urlData.publicUrl,
    storagePath: path,
    name: file.name,
    size: file.size,
  };
};

export const deleteQrFile = async (publicUrl: string | null) => {
  if (!publicUrl) return;
  const marker = `/object/public/${STORAGE_BUCKET}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx < 0) return;
  const storagePath = publicUrl.slice(idx + marker.length);
  await supabase.storage.from(STORAGE_BUCKET).remove([storagePath]);
};

export function useQrSections(includeHidden = false) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: [...QUERY_KEY, includeHidden],
    queryFn: async () => {
      let q = supabase
        .from("qr_sections" as never)
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (!includeHidden) q = q.eq("is_visible", true);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as QrSection[];
    },
  });

  const createSection = useMutation({
    mutationFn: async (input: { title: string }) => {
      const title = input.title.trim() || "Neue Sektion";
      const { data: maxRow } = await supabase
        .from("qr_sections" as never)
        .select("sort_order")
        .order("sort_order", { ascending: false })
        .limit(1)
        .maybeSingle();
      const nextOrder = ((maxRow as { sort_order?: number } | null)?.sort_order ?? -1) + 1;

      const baseSlug = slugify(title) || `section-${Date.now()}`;
      // ensure slug unique by appending suffix if collides
      let slug = baseSlug;
      let suffix = 2;
      while (true) {
        const { data: existing } = await supabase
          .from("qr_sections" as never)
          .select("id")
          .eq("slug", slug)
          .maybeSingle();
        if (!existing) break;
        slug = `${baseSlug}-${suffix++}`;
      }

      const { data, error } = await supabase
        .from("qr_sections" as never)
        .insert({ slug, title, sort_order: nextOrder })
        .select("*")
        .single();
      if (error) throw error;
      return data as unknown as QrSection;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  const updateSection = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<QrSection> & { id: string }) => {
      const { data, error } = await supabase
        .from("qr_sections" as never)
        .update(updates)
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw error;
      return data as unknown as QrSection;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  const deleteSection = useMutation({
    mutationFn: async (section: QrSection) => {
      // best-effort storage cleanup
      await Promise.allSettled([
        deleteQrFile(section.file_de_url),
        deleteQrFile(section.file_en_url),
      ]);
      const { error } = await supabase
        .from("qr_sections" as never)
        .delete()
        .eq("id", section.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  const reorderSections = useMutation({
    mutationFn: async (orderedIds: string[]) => {
      // Set sort_order in one batch, gives stable ordering
      await Promise.all(
        orderedIds.map((id, index) =>
          supabase
            .from("qr_sections" as never)
            .update({ sort_order: index })
            .eq("id", id),
        ),
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  return {
    ...query,
    createSection,
    updateSection,
    deleteSection,
    reorderSections,
  };
}
