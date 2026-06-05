import { useState, useRef } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { usePartnerTiles, type PartnerTile } from "@/hooks/usePartnerTiles";
import { useTranslateContent } from "@/hooks/useTranslateContent";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TranslatableField } from "@/components/admin/TranslatableField";
import { toast } from "sonner";
import { Upload, Trash2, Plus, Palette, ImageIcon, Link } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryClient } from "@tanstack/react-query";

const AdminPartnerTiles = () => {
  const { data: tiles, isLoading, uploadLogoMutation, updateMutation, createMutation, deleteMutation } = usePartnerTiles(false);
  const { translateRow } = useTranslateContent();
  const queryClient = useQueryClient();
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [newName, setNewName] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [newType, setNewType] = useState<"equipment" | "local">("equipment");

  const runTranslate = (id: string) => {
    translateRow({ table: "partner_tiles", id, fields: ["description"] }).then((result) => {
      if (!result) {
        toast.error("DeepL nicht konfiguriert — EN-Felder bleiben leer. Im Admin → Integrationen einrichten.");
      } else if (result.updatedFields.length > 0) {
        toast.success("Übersetzung aktualisiert");
      } else if (result.skipped.length > 0) {
        toast.info("Manuell gesperrt — nicht überschrieben");
      }
      queryClient.invalidateQueries({ queryKey: ["partner-tiles"] });
    });
  };

  const handleLogoUpload = async (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await uploadLogoMutation.mutateAsync({ id, file });
      toast.success("Logo hochgeladen");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleColorChange = async (id: string, color: string) => {
    try {
      await updateMutation.mutateAsync({ id, bg_color: color } as any);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleToggleActive = async (id: string, is_active: boolean) => {
    try {
      await updateMutation.mutateAsync({ id, is_active } as any);
      toast.success(is_active ? "Aktiviert" : "Deaktiviert");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleSortChange = async (id: string, sort_order: number) => {
    await updateMutation.mutateAsync({ id, sort_order } as any);
  };

  const handleCreate = async () => {
    if (!newName.trim() || !newSlug.trim()) {
      toast.error("Name und Slug erforderlich");
      return;
    }
    try {
      await createMutation.mutateAsync({ name: newName, slug: newSlug, partner_type: newType });
      setNewName("");
      setNewSlug("");
      setNewType("equipment");
      toast.success("Partner hinzugefügt");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Partner wirklich löschen?")) return;
    try {
      await deleteMutation.mutateAsync(id);
      toast.success("Partner gelöscht");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Partner-Kacheln</h1>
            <p className="text-muted-foreground">Verwalte die Partner-Logos und Hintergrundfarben auf der Homepage.</p>
          </div>
        </div>

        {/* Create new */}
        <Card className="p-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2"><Plus className="w-4 h-4" /> Neuen Partner hinzufügen</h3>
          <div className="flex gap-3 items-end flex-wrap">
            <div className="flex-1 min-w-[140px]">
              <label className="text-sm text-muted-foreground">Name</label>
              <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="z.B. Red Bull" />
            </div>
            <div className="flex-1 min-w-[140px]">
              <label className="text-sm text-muted-foreground">Slug</label>
              <Input value={newSlug} onChange={e => setNewSlug(e.target.value)} placeholder="z.B. redbull" />
            </div>
            <div className="w-[180px]">
              <label className="text-sm text-muted-foreground">Typ</label>
              <Select value={newType} onValueChange={(v: "equipment" | "local") => setNewType(v)}>
                <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="equipment">Equipment-Partner</SelectItem>
                  <SelectItem value="local">Standortpartner</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              <Plus className="w-4 h-4 mr-1" /> Hinzufügen
            </Button>
          </div>
        </Card>

        {isLoading ? (
          <div className="grid gap-4">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
        ) : (
          <div className="grid gap-4">
            {tiles?.map(tile => (
              <Card key={tile.id} className="p-4 space-y-3">
                <div className="flex items-center gap-4 flex-wrap">
                  {/* Logo preview */}
                  <div
                    className="w-20 h-20 rounded-xl flex items-center justify-center border border-border shrink-0 overflow-hidden"
                    style={{ backgroundColor: tile.bg_color || "#FFFFFF" }}
                  >
                    {tile.logo_url ? (
                      <img src={tile.logo_url} alt={tile.name} className="h-14 w-auto object-contain" />
                    ) : (
                      <ImageIcon className="w-8 h-8 text-muted-foreground/30" />
                    )}
                  </div>

                  {/* Name & slug */}
                  <div className="flex-1 min-w-[150px]">
                    <p className="font-semibold">{tile.name}</p>
                    <p className="text-sm text-muted-foreground">{tile.slug}</p>
                  </div>

                  {/* Partner type */}
                  <div className="w-[180px]">
                    <Select
                      value={tile.partner_type || "equipment"}
                      onValueChange={(v) => updateMutation.mutate({ id: tile.id, partner_type: v } as any)}
                    >
                      <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="equipment">Equipment-Partner</SelectItem>
                        <SelectItem value="local">Standortpartner</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Website URL */}
                  <div className="flex items-center gap-2 min-w-[200px]">
                    <Link className="w-4 h-4 text-muted-foreground shrink-0" />
                    <Input
                      type="url"
                      placeholder="https://..."
                      defaultValue={tile.website_url || ""}
                      onBlur={e => {
                        const val = e.target.value.trim() || null;
                        if (val !== (tile.website_url || null)) {
                          updateMutation.mutate({ id: tile.id, website_url: val } as any);
                        }
                      }}
                      className="h-8 text-sm"
                    />
                  </div>

                  {/* Color picker */}
                  <div className="flex items-center gap-2">
                    <Palette className="w-4 h-4 text-muted-foreground" />
                    <input
                      type="color"
                      value={tile.bg_color || "#FFFFFF"}
                      onChange={e => handleColorChange(tile.id, e.target.value)}
                      className="w-10 h-10 rounded-lg border border-border cursor-pointer"
                    />
                  </div>

                  {/* Sort order */}
                  <div className="flex items-center gap-1">
                    <label className="text-xs text-muted-foreground">Sort:</label>
                    <Input
                      type="number"
                      value={tile.sort_order ?? 0}
                      onChange={e => handleSortChange(tile.id, parseInt(e.target.value) || 0)}
                      className="w-16 h-8 text-center"
                    />
                  </div>

                  {/* Active toggle */}
                  <Switch
                    checked={tile.is_active ?? true}
                    onCheckedChange={v => handleToggleActive(tile.id, v)}
                  />

                  {/* Upload */}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    ref={el => { fileInputRefs.current[tile.id] = el; }}
                    onChange={e => handleLogoUpload(tile.id, e)}
                  />
                  <Button variant="outline" size="sm" onClick={() => fileInputRefs.current[tile.id]?.click()}>
                    <Upload className="w-4 h-4" />
                  </Button>

                  {/* Delete */}
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(tile.id)} className="text-destructive hover:text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                {/* Local partner fields: Region + Description */}
                {/* Description for ALL partner types — translatable DE+EN */}
                <div className="flex gap-4 pl-24 flex-wrap">
                  {tile.partner_type === "local" && (
                    <div className="w-[200px]">
                      <label className="text-xs text-muted-foreground">Region</label>
                      <Input
                        placeholder="z.B. Bamberg"
                        defaultValue={tile.region || ""}
                        onBlur={e => {
                          const val = e.target.value.trim() || null;
                          if (val !== (tile.region || null)) {
                            updateMutation.mutate({ id: tile.id, region: val } as any);
                          }
                        }}
                        className="h-8 text-sm"
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-[300px]">
                    <PartnerDescriptionEditor
                      tile={tile}
                      onSave={async (payload) => {
                        await updateMutation.mutateAsync({ id: tile.id, ...payload } as any);
                        runTranslate(tile.id);
                      }}
                    />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

interface DescriptionPayload {
  description: string | null;
  description_en: string | null;
  description_en_locked: boolean;
}

const PartnerDescriptionEditor = ({
  tile,
  onSave,
}: {
  tile: PartnerTile;
  onSave: (payload: DescriptionPayload) => Promise<void>;
}) => {
  const [de, setDe] = useState(tile.description || "");
  const [en, setEn] = useState(tile.description_en || "");
  const [locked, setLocked] = useState(!!tile.description_en_locked);
  const [saving, setSaving] = useState(false);

  const hasChanged =
    de !== (tile.description || "") ||
    en !== (tile.description_en || "") ||
    locked !== !!tile.description_en_locked;

  const handleSave = async () => {
    if (!hasChanged) return;
    setSaving(true);
    try {
      await onSave({
        description: de.trim() || null,
        description_en: en.trim() || null,
        description_en_locked: locked,
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
        label="Beschreibung"
        deValue={de}
        onDeChange={setDe}
        enValue={en}
        onEnChange={setEn}
        locked={locked}
        onLockedChange={setLocked}
        placeholder="Beschreibung des Partners..."
        multiline
        rows={3}
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

export default AdminPartnerTiles;
