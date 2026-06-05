import { useState, useRef } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useSkyPadelGallery, type SkyPadelGalleryImage } from "@/hooks/useSkyPadelGallery";
import { useTranslateContent, toastTranslateResult } from "@/hooks/useTranslateContent";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { TranslatableField } from "@/components/admin/TranslatableField";
import { toast } from "sonner";
import { Upload, Trash2, GripVertical, ImageIcon } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

const AdminSkyPadelGallery = () => {
  const { data: images, isLoading, uploadMutation, deleteMutation, updateMutation } = useSkyPadelGallery(false);
  const { translateRow } = useTranslateContent();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const runTranslate = (id: string) => {
    translateRow({ table: "skypadel_gallery", id, fields: ["alt_text"] }).then((result) => {
      toastTranslateResult(result);
      queryClient.invalidateQueries({ queryKey: ["skypadel-gallery"] });
    });
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        await uploadMutation.mutateAsync({ file });
      }
      toast.success(`${files.length} Bild(er) hochgeladen`);
    } catch (err: any) {
      toast.error("Upload fehlgeschlagen: " + err.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bild wirklich löschen?")) return;
    try {
      await deleteMutation.mutateAsync(id);
      toast.success("Bild gelöscht");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleSortChange = async (id: string, newSort: number) => {
    await updateMutation.mutateAsync({ id, sort_order: newSort });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">SkyPadel Galerie</h1>
            <p className="text-muted-foreground text-sm">Bilder für die „Für Vereine"-Seite verwalten</p>
          </div>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleUpload}
            />
            <Button onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              <Upload className="w-4 h-4 mr-2" />
              {uploading ? "Lädt…" : "Bilder hochladen"}
            </Button>
          </div>
        </div>

        {isLoading ? (
          <p className="text-muted-foreground">Laden…</p>
        ) : !images?.length ? (
          <Card className="p-12 flex flex-col items-center gap-3 text-muted-foreground">
            <ImageIcon className="w-12 h-12" />
            <p>Noch keine Bilder hochgeladen</p>
          </Card>
        ) : (
          <div className="grid gap-4">
            {images.map((img) => (
              <Card key={img.id} className="p-4 flex items-start gap-4">
                <GripVertical className="w-5 h-5 text-muted-foreground shrink-0 mt-1" />
                <img
                  src={img.image_url}
                  alt={img.alt_text || "Gallery"}
                  className="w-28 h-20 object-cover rounded-lg shrink-0"
                />
                <div className="flex-1 space-y-3">
                  <GalleryAltTextEditor
                    image={img}
                    onSave={async (payload) => {
                      await (supabase as any)
                        .from("skypadel_gallery")
                        .update({ ...payload, updated_at: new Date().toISOString() })
                        .eq("id", img.id);
                      runTranslate(img.id);
                      queryClient.invalidateQueries({ queryKey: ["skypadel-gallery"] });
                    }}
                  />
                  <div className="flex items-center gap-4">
                    <label className="text-sm text-muted-foreground flex items-center gap-2">
                      Reihenfolge:
                      <Input
                        type="number"
                        className="w-20"
                        defaultValue={img.sort_order}
                        onBlur={(e) => handleSortChange(img.id, Number(e.target.value))}
                      />
                    </label>
                    <label className="text-sm text-muted-foreground flex items-center gap-2">
                      Aktiv:
                      <Switch
                        checked={img.is_active}
                        onCheckedChange={(checked) =>
                          updateMutation.mutate({ id: img.id, is_active: checked })
                        }
                      />
                    </label>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(img.id)}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

interface AltTextPayload {
  alt_text: string | null;
  alt_text_en: string | null;
  alt_text_en_locked: boolean;
}

const GalleryAltTextEditor = ({
  image,
  onSave,
}: {
  image: SkyPadelGalleryImage;
  onSave: (payload: AltTextPayload) => Promise<void>;
}) => {
  const [de, setDe] = useState(image.alt_text || "");
  const [en, setEn] = useState(image.alt_text_en || "");
  const [locked, setLocked] = useState(!!image.alt_text_en_locked);
  const [saving, setSaving] = useState(false);

  const hasChanged =
    de !== (image.alt_text || "") ||
    en !== (image.alt_text_en || "") ||
    locked !== !!image.alt_text_en_locked;

  const handleSave = async () => {
    if (!hasChanged) return;
    setSaving(true);
    try {
      await onSave({
        alt_text: de.trim() || null,
        alt_text_en: en.trim() || null,
        alt_text_en_locked: locked,
      });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-2">
      <TranslatableField
        label="Alt-Text"
        deValue={de}
        onDeChange={setDe}
        enValue={en}
        onEnChange={setEn}
        locked={locked}
        onLockedChange={setLocked}
        placeholder="Alt-Text (optional)"
        disabled={saving}
      />
      {hasChanged && (
        <div className="flex justify-end">
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? "Speichern…" : "Speichern"}
          </Button>
        </div>
      )}
    </div>
  );
};

export default AdminSkyPadelGallery;
