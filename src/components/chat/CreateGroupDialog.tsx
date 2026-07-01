import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useFriendships } from "@/hooks/useFriendships";
import { useCreateGroup } from "@/hooks/useChat";
import { cn } from "@/lib/utils";

interface CreateGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (groupId: string) => void;
}

export function CreateGroupDialog({ open, onOpenChange, onCreated }: CreateGroupDialogProps) {
  const { t } = useTranslation("social");
  const { friends } = useFriendships();
  const createGroup = useCreateGroup();
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const reset = () => {
    setName("");
    setSelected(new Set());
  };

  const handleSubmit = async () => {
    const group = await createGroup.mutateAsync({
      name,
      memberIds: Array.from(selected),
    });
    reset();
    onOpenChange(false);
    onCreated?.(group.id);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("createGroupDialog.title")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="group-name">{t("createGroupDialog.nameLabel")}</Label>
            <Input
              id="group-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("createGroupDialog.namePlaceholder")}
              maxLength={100}
            />
          </div>

          <div>
            <Label>{t("createGroupDialog.membersLabel", { count: selected.size })}</Label>
            {friends.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                {t("createGroupDialog.noFriends")}
              </p>
            ) : (
              <ScrollArea className="h-64 mt-2 rounded-lg border border-border/50">
                <ul className="divide-y divide-border/30">
                  {friends.map((f) => {
                    const isSel = selected.has(f.id);
                    const initials =
                      f.displayName
                        ?.split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase() ||
                      f.username?.[0]?.toUpperCase() ||
                      "?";
                    return (
                      <li key={f.id}>
                        <button
                          type="button"
                          onClick={() => toggle(f.id)}
                          className={cn(
                            "w-full flex items-center gap-3 p-2.5 text-left hover:bg-primary/5 transition-colors",
                            isSel && "bg-primary/10",
                          )}
                        >
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={f.avatarUrl || undefined} />
                            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {f.displayName || f.username || t("common.unknown")}
                            </p>
                            {f.username && f.displayName && (
                              <p className="text-xs text-muted-foreground truncate">
                                @{f.username}
                              </p>
                            )}
                          </div>
                          <div
                            className={cn(
                              "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors",
                              isSel
                                ? "bg-primary border-primary text-primary-foreground"
                                : "border-border",
                            )}
                          >
                            {isSel && <Check className="w-3 h-3" />}
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </ScrollArea>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              !name.trim() || selected.size === 0 || createGroup.isPending
            }
          >
            {createGroup.isPending ? t("createGroupDialog.creating") : t("createGroupDialog.create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
