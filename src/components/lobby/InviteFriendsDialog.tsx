import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, UserPlus, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useFriendships } from "@/hooks/useFriendships";
import {
  useInviteToLobby,
  useLobbyInvitesForHost,
} from "@/hooks/useLobbies";
import { cn } from "@/lib/utils";

interface InviteFriendsDialogProps {
  lobbyId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InviteFriendsDialog({ lobbyId, open, onOpenChange }: InviteFriendsDialogProps) {
  const { t } = useTranslation("social");
  const { friends, isLoadingFriends } = useFriendships();
  const { data: existingInvites = [] } = useLobbyInvitesForHost(lobbyId);
  const invite = useInviteToLobby();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Friends who already have a pending/accepted invite for this lobby
  const alreadyInvited = useMemo(
    () =>
      new Set(
        existingInvites
          .filter((i) => i.status === "pending" || i.status === "accepted")
          .map((i) => i.invitee_id),
      ),
    [existingInvites],
  );

  const availableFriends = useMemo(
    () => friends.filter((f) => !alreadyInvited.has(f.id)),
    [friends, alreadyInvited],
  );

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSubmit = async () => {
    if (selected.size === 0) return;
    await invite.mutateAsync({ lobbyId, inviteeIds: Array.from(selected) });
    setSelected(new Set());
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("inviteFriendsDialog.title")}</DialogTitle>
        </DialogHeader>

        {isLoadingFriends ? (
          <div className="py-12 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : friends.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {t("inviteFriendsDialog.noFriends")}
          </p>
        ) : availableFriends.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {t("inviteFriendsDialog.allInvited")}
          </p>
        ) : (
          <ScrollArea className="h-72 rounded-lg border border-border/50">
            <ul className="divide-y divide-border/30">
              {availableFriends.map((f) => {
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
                        "w-full flex items-center gap-3 p-3 text-left hover:bg-primary/5 transition-colors",
                        isSel && "bg-primary/10",
                      )}
                    >
                      <Avatar className="w-8 h-8 shrink-0">
                        <AvatarImage src={f.avatarUrl || undefined} />
                        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {f.displayName || f.username || t("common.unknown")}
                        </p>
                        {f.skillLevel > 0 && (
                          <p className="text-xs text-muted-foreground">
                            {t("inviteFriendsDialog.skill", { level: f.skillLevel.toFixed(1) })}
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

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={selected.size === 0 || invite.isPending}
          >
            {invite.isPending ? (
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
            ) : (
              <UserPlus className="w-4 h-4 mr-1" />
            )}
            {selected.size > 0 ? t("inviteFriendsDialog.inviteCount", { count: selected.size }) : t("inviteFriendsDialog.invite")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
