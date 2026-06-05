import { useState, useRef } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { TranslatableField } from "@/components/admin/TranslatableField";
import { useTranslateContent } from "@/hooks/useTranslateContent";
import {
  useQrSections,
  uploadQrFile,
  deleteQrFile,
  validateFile,
  type QrSection,
  type QrLang,
} from "@/hooks/useQrSections";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Upload,
  FileText,
  ExternalLink,
  X,
  Save,
  Loader2,
  QrCode,
} from "lucide-react";

const TRANSLATABLE_FIELDS = ["title", "description"];

const formatSize = (bytes: number | null | undefined): string => {
  if (!bytes || bytes <= 0) return "";
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
};

interface SectionEditorState {
  title: string;
  title_en: string;
  title_en_locked: boolean;
  description: string;
  description_en: string;
  description_en_locked: boolean;
}

const SectionEditor = ({
  section,
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
  onDelete,
}: {
  section: QrSection;
  isFirst: boolean;
  isLast: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
}) => {
  const { updateSection } = useQrSections(true);
  const { translateRow } = useTranslateContent();

  const [state, setState] = useState<SectionEditorState>({
    title: section.title ?? "",
    title_en: section.title_en ?? "",
    title_en_locked: section.title_en_locked,
    description: section.description ?? "",
    description_en: section.description_en ?? "",
    description_en_locked: section.description_en_locked,
  });
  const [saving, setSaving] = useState(false);
  const [uploadingLang, setUploadingLang] = useState<QrLang | null>(null);
  const fileInputDe = useRef<HTMLInputElement | null>(null);
  const fileInputEn = useRef<HTMLInputElement | null>(null);

  const runTranslate = (id: string) => {
    translateRow({ table: "qr_sections", id, fields: TRANSLATABLE_FIELDS }).then((result) => {
      if (!result) {
        toast.error("DeepL nicht konfiguriert — EN-Felder bleiben leer. Im Admin → Integrationen einrichten.");
        return;
      }
      if (result.updatedFields.length > 0) toast.success("Übersetzung aktualisiert");
      else if (result.skipped.length > 0) toast.info("Manuell gesperrt — nicht überschrieben");
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSection.mutateAsync({
        id: section.id,
        title: state.title.trim(),
        title_en: state.title_en.trim() || null,
        title_en_locked: state.title_en_locked,
        description: state.description.trim() || null,
        description_en: state.description_en.trim() || null,
        description_en_locked: state.description_en_locked,
      });
      toast.success("Gespeichert");
      runTranslate(section.id);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleVisible = async (next: boolean) => {
    try {
      await updateSection.mutateAsync({ id: section.id, is_visible: next });
      toast.success(next ? "Sichtbar" : "Versteckt");
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const handleUpload = async (lang: QrLang, file: File | null | undefined) => {
    if (!file) return;
    const v = validateFile(file);
    if (!v.ok) {
      toast.error(v.reason);
      return;
    }
    setUploadingLang(lang);
    try {
      const uploaded = await uploadQrFile(section, lang, file);
      const previousUrl = lang === "de" ? section.file_de_url : section.file_en_url;
      await updateSection.mutateAsync(
        lang === "de"
          ? {
              id: section.id,
              file_de_url: uploaded.url,
              file_de_name: uploaded.name,
              file_de_size_bytes: uploaded.size,
            }
          : {
              id: section.id,
              file_en_url: uploaded.url,
              file_en_name: uploaded.name,
              file_en_size_bytes: uploaded.size,
            },
      );
      if (previousUrl && previousUrl !== uploaded.url) {
        await deleteQrFile(previousUrl).catch(() => null);
      }
      toast.success(`Datei (${lang.toUpperCase()}) hochgeladen`);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setUploadingLang(null);
      if (lang === "de" && fileInputDe.current) fileInputDe.current.value = "";
      if (lang === "en" && fileInputEn.current) fileInputEn.current.value = "";
    }
  };

  const handleRemoveFile = async (lang: QrLang) => {
    const url = lang === "de" ? section.file_de_url : section.file_en_url;
    if (!url) return;
    if (!confirm(`Datei (${lang.toUpperCase()}) wirklich entfernen?`)) return;
    try {
      await updateSection.mutateAsync(
        lang === "de"
          ? { id: section.id, file_de_url: null, file_de_name: null, file_de_size_bytes: null }
          : { id: section.id, file_en_url: null, file_en_name: null, file_en_size_bytes: null },
      );
      await deleteQrFile(url).catch(() => null);
      toast.success(`Datei (${lang.toUpperCase()}) entfernt`);
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <Card className="p-5 md:p-6 space-y-4">
      {/* Header row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <code className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground font-mono">
            /{section.slug}
          </code>
          <label className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <Switch
              checked={section.is_visible}
              onCheckedChange={handleToggleVisible}
            />
            {section.is_visible ? "Sichtbar" : "Versteckt"}
          </label>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" disabled={isFirst} onClick={onMoveUp} title="Nach oben">
            <ChevronUp className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" disabled={isLast} onClick={onMoveDown} title="Nach unten">
            <ChevronDown className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onDelete}
            title="Sektion löschen"
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Translatable fields */}
      <TranslatableField
        label="Titel"
        deValue={state.title}
        onDeChange={(v) => setState((s) => ({ ...s, title: v }))}
        enValue={state.title_en}
        onEnChange={(v) => setState((s) => ({ ...s, title_en: v }))}
        locked={state.title_en_locked}
        onLockedChange={(v) => setState((s) => ({ ...s, title_en_locked: v }))}
        placeholder="z.B. Für Vereine"
      />
      <TranslatableField
        label="Beschreibung"
        multiline
        rows={3}
        deValue={state.description}
        onDeChange={(v) => setState((s) => ({ ...s, description: v }))}
        enValue={state.description_en}
        onEnChange={(v) => setState((s) => ({ ...s, description_en: v }))}
        locked={state.description_en_locked}
        onLockedChange={(v) => setState((s) => ({ ...s, description_en_locked: v }))}
        placeholder="Worum geht es in dieser Sektion?"
      />

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} size="sm">
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Texte speichern
        </Button>
      </div>

      {/* File uploads */}
      <div className="grid sm:grid-cols-2 gap-4 pt-4 border-t border-border">
        {(["de", "en"] as const).map((lang) => {
          const url = lang === "de" ? section.file_de_url : section.file_en_url;
          const name = lang === "de" ? section.file_de_name : section.file_en_name;
          const size = lang === "de" ? section.file_de_size_bytes : section.file_en_size_bytes;
          const ref = lang === "de" ? fileInputDe : fileInputEn;
          return (
            <div key={lang} className="space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${lang === "de" ? "bg-primary/15 text-primary" : "bg-[#0F2B46]/15 text-[#0F2B46] dark:text-white dark:bg-white/15"}`}>
                  {lang.toUpperCase()}
                </span>
                Datei
              </div>
              {url ? (
                <div className="rounded-xl border border-border bg-muted/40 p-3 flex flex-col gap-2">
                  <div className="flex items-start gap-2 min-w-0">
                    <FileText className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate" title={name ?? ""}>
                        {name ?? "Datei"}
                      </p>
                      <p className="text-xs text-muted-foreground">{formatSize(size)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(lang)}
                      className="text-muted-foreground hover:text-destructive transition-colors p-1"
                      title="Entfernen"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md border border-border hover:bg-accent transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Öffnen
                    </a>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => ref.current?.click()}
                      disabled={uploadingLang === lang}
                    >
                      {uploadingLang === lang ? (
                        <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
                      ) : (
                        <Upload className="w-3 h-3 mr-1.5" />
                      )}
                      Ersetzen
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="outline"
                  className="w-full h-20 border-dashed flex flex-col gap-1"
                  onClick={() => ref.current?.click()}
                  disabled={uploadingLang === lang}
                >
                  {uploadingLang === lang ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  <span className="text-xs">PDF hochladen (max 25 MB)</span>
                </Button>
              )}
              <Input
                ref={ref}
                type="file"
                accept="application/pdf,image/*"
                className="hidden"
                onChange={(e) => handleUpload(lang, e.target.files?.[0])}
              />
            </div>
          );
        })}
      </div>
    </Card>
  );
};

const AdminQrPanel = () => {
  const { data: sections = [], isLoading, createSection, deleteSection, reorderSections } =
    useQrSections(true);
  const [newTitle, setNewTitle] = useState("");
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      await createSection.mutateAsync({ title: newTitle.trim() });
      setNewTitle("");
      toast.success("Sektion angelegt");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setCreating(false);
    }
  };

  const handleMove = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= sections.length) return;
    const ordered = [...sections];
    const [moved] = ordered.splice(index, 1);
    ordered.splice(target, 0, moved);
    try {
      await reorderSections.mutateAsync(ordered.map((s) => s.id));
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const handleDelete = async (section: QrSection) => {
    if (!confirm(`Sektion "${section.title}" wirklich löschen? Dateien werden mit entfernt.`)) return;
    try {
      await deleteSection.mutateAsync(section);
      toast.success("Sektion gelöscht");
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <QrCode className="h-6 w-6 text-primary" />
              QR-Panel
            </h1>
            <p className="text-muted-foreground mt-1">
              Inhalte für die Visitenkarten-Landingpage <code className="text-xs font-mono px-1.5 py-0.5 rounded bg-muted">/qr</code>.
              Sektionen, Texte und PDFs verwalten. Änderungen sind sofort live.
            </p>
          </div>
          <a
            href="/qr"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
          >
            <ExternalLink className="w-4 h-4" />
            Live-Seite öffnen
          </a>
        </div>

        {/* Add new */}
        <Card className="p-4 flex items-center gap-3">
          <Input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Neue Sektion (z.B. 'Pressekit')"
            className="flex-1"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate();
            }}
          />
          <Button onClick={handleCreate} disabled={creating || !newTitle.trim()}>
            {creating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
            Hinzufügen
          </Button>
        </Card>

        {/* Sections list */}
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="h-64 animate-pulse bg-muted/30" />
            ))}
          </div>
        ) : sections.length === 0 ? (
          <Card className="p-10 text-center text-muted-foreground">
            Noch keine Sektion. Leg oben eine an.
          </Card>
        ) : (
          <div className="space-y-4">
            {sections.map((section, index) => (
              <SectionEditor
                key={section.id}
                section={section}
                isFirst={index === 0}
                isLast={index === sections.length - 1}
                onMoveUp={() => handleMove(index, -1)}
                onMoveDown={() => handleMove(index, 1)}
                onDelete={() => handleDelete(section)}
              />
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminQrPanel;
