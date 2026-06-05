import { Lock, Unlock, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface TranslatableFieldProps {
  label: string;
  /** German source value (always editable). */
  deValue: string;
  onDeChange: (value: string) => void;
  /** English value — auto-filled by DeepL, editable when locked. */
  enValue: string;
  onEnChange: (value: string) => void;
  /** When true, EN field will not be overwritten by the next auto-translate. */
  locked: boolean;
  onLockedChange: (locked: boolean) => void;
  placeholder?: string;
  /** Use a textarea instead of an input. */
  multiline?: boolean;
  rows?: number;
  /** Disable everything (e.g. while saving). */
  disabled?: boolean;
}

export const TranslatableField = ({
  label,
  deValue,
  onDeChange,
  enValue,
  onEnChange,
  locked,
  onLockedChange,
  placeholder,
  multiline = false,
  rows = 3,
  disabled = false,
}: TranslatableFieldProps) => {
  const TextComponent = multiline ? Textarea : Input;
  const commonClass = "text-sm";
  return (
    <div className="space-y-2">
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
            <span className="px-1.5 py-0.5 rounded bg-primary/15 text-primary text-[10px] font-bold">DE</span>
            {label}
          </Label>
          <TextComponent
            value={deValue}
            onChange={(e) => onDeChange((e.target as HTMLInputElement | HTMLTextAreaElement).value)}
            placeholder={placeholder}
            rows={multiline ? rows : undefined}
            disabled={disabled}
            className={commonClass}
          />
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
              <span className="px-1.5 py-0.5 rounded bg-[#0F2B46]/15 text-[#0F2B46] dark:text-white dark:bg-white/15 text-[10px] font-bold">EN</span>
              {label}
              {!locked && !enValue && (
                <span className="text-[10px] text-muted-foreground inline-flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  auto-translate
                </span>
              )}
            </Label>
            <button
              type="button"
              onClick={() => onLockedChange(!locked)}
              disabled={disabled}
              title={
                locked
                  ? "Manuell gesperrt — beim nächsten Speichern nicht überschrieben. Klicken zum Entsperren."
                  : "Automatisch übersetzt — beim nächsten Speichern überschrieben. Klicken zum Sperren."
              }
              className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded transition-colors ${
                locked
                  ? "bg-amber-500/15 text-amber-600 hover:bg-amber-500/25"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
              {locked ? "gesperrt" : "auto"}
            </button>
          </div>
          <TextComponent
            value={enValue}
            onChange={(e) => onEnChange((e.target as HTMLInputElement | HTMLTextAreaElement).value)}
            placeholder={locked ? placeholder : "Wird nach dem Speichern automatisch befüllt"}
            rows={multiline ? rows : undefined}
            disabled={disabled || (!locked && !enValue)}
            className={`${commonClass} ${!locked && !enValue ? "italic text-muted-foreground" : ""}`}
          />
        </div>
      </div>
    </div>
  );
};
