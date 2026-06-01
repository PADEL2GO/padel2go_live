import { useState } from "react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import {
  MapPin,
  Calendar,
  Clock,
  Users,
  UserPlus,
  Zap,
  Loader2,
  CheckCircle,
  X,
  Lock,
  Mail,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useAuth } from "@/hooks/useAuth";
import {
  useLobbyDetail,
  useJoinLobby,
  useLeaveLobby,
  useLobbyInvitesForHost,
  useCancelLobbyInvite,
} from "@/hooks/useLobbies";
import { useFriendships } from "@/hooks/useFriendships";
import { InviteFriendsDialog } from "./InviteFriendsDialog";
import type { LobbyMember } from "@/types/lobby";

interface LobbyDetailDrawerProps {
  lobbyId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function MemberItem({
  member,
  isHost,
  isSelf,
  friendStatus,
  onSendFriendRequest,
  sendingRequest,
}: {
  member: LobbyMember;
  isHost: boolean;
  isSelf: boolean;
  friendStatus: "self" | "friend" | "pending" | "none";
  onSendFriendRequest: (userId: string) => void;
  sendingRequest: boolean;
}) {
  const label = isHost ? "Host" : "Dabei";
  const variant: "default" | "secondary" = isHost ? "default" : "secondary";
  const StatusIcon = isHost ? CheckCircle : Users;

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
      <Avatar className="h-10 w-10">
        <AvatarImage src={member.profiles?.avatar_url || undefined} />
        <AvatarFallback>
          {member.profiles?.display_name?.[0] || "?"}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">
          {member.profiles?.display_name || member.profiles?.username || "Spieler"}
        </p>
        {member.skill_level && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Zap className="w-3 h-3 text-yellow-500" />
            Skill {member.skill_level}
          </p>
        )}
      </div>

      {/* Friend-add button: only when viewer is not this member,
          not already friends, and no pending request */}
      {!isSelf && friendStatus === "none" && (
        <Button
          size="sm"
          variant="outline"
          className="shrink-0 h-8 px-2"
          onClick={() => onSendFriendRequest(member.user_id)}
          disabled={sendingRequest}
          aria-label="Freundschaftsanfrage senden"
          title="Freundschaftsanfrage senden"
        >
          {sendingRequest ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <UserPlus className="w-3.5 h-3.5" />
          )}
        </Button>
      )}
      {friendStatus === "pending" && !isSelf && (
        <Badge variant="outline" className="shrink-0 text-[10px]">
          Anfrage gesendet
        </Badge>
      )}
      {friendStatus === "friend" && !isSelf && (
        <Badge variant="outline" className="shrink-0 text-[10px] gap-1">
          <Check className="w-2.5 h-2.5" />
          Freund
        </Badge>
      )}

      <Badge variant={variant} className="shrink-0">
        <StatusIcon className="w-3 h-3 mr-1" />
        {label}
      </Badge>
    </div>
  );
}

export function LobbyDetailDrawer({
  lobbyId,
  open,
  onOpenChange,
}: LobbyDetailDrawerProps) {
  const { user } = useAuth();
  const { data: lobby, isLoading } = useLobbyDetail(lobbyId || undefined);
  const joinMutation = useJoinLobby();
  const leaveMutation = useLeaveLobby();
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const isHost = lobby?.host_user_id === user?.id;

  const members = lobby?.members || [];
  const membersCount = members.filter(m =>
    m.status === "paid" || m.status === "joined" || m.status === "reserved"
  ).length;
  const freeSpots = lobby ? lobby.capacity - membersCount : 0;

  // Check user's membership status (host counts as member for permissions)
  const userMembership = members.find((m) => m.user_id === user?.id);
  const canJoin = lobby?.status === "open" && !userMembership && !isHost && freeSpots > 0;
  const canLeave = !!userMembership && !isHost;
  const canInvite = isHost || !!userMembership;

  // Invite list is visible to anyone who can invite
  const { data: lobbyInvites = [] } = useLobbyInvitesForHost(canInvite ? lobbyId || undefined : undefined);
  const cancelInvite = useCancelLobbyInvite();

  // Friend status for each member — host can add new joiners as friends etc.
  const { friends, pendingSent, sendRequest, isSendingRequest } = useFriendships();
  const friendIdSet = new Set(friends.map((f) => f.id));
  const pendingSentIdSet = new Set(pendingSent.map((r) => r.userId));
  const friendStatusFor = (uid: string): "self" | "friend" | "pending" | "none" => {
    if (uid === user?.id) return "self";
    if (friendIdSet.has(uid)) return "friend";
    if (pendingSentIdSet.has(uid)) return "pending";
    return "none";
  };
  const [pendingTargetUserId, setPendingTargetUserId] = useState<string | null>(null);
  const handleSendFriendRequest = (uid: string) => {
    setPendingTargetUserId(uid);
    sendRequest(uid);
  };

  if (!lobbyId) return null;

  const handleJoin = () => {
    if (lobbyId) {
      joinMutation.mutate(lobbyId);
    }
  };

  const handleLeave = () => {
    if (lobbyId) {
      leaveMutation.mutate(lobbyId);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col p-0">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : lobby ? (
          <>
            <SheetHeader className="p-6 pb-4 border-b border-border">
              <div className="flex items-start justify-between">
                <div>
                  <SheetTitle className="text-xl">
                    {lobby.locations?.name || "Lobby"}
                  </SheetTitle>
                  <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {lobby.courts?.name}
                    {lobby.locations?.address && ` • ${lobby.locations.address}`}
                  </p>
                </div>
                <Badge variant={lobby.status === "open" ? "default" : "secondary"}>
                  {lobby.status === "open" ? "Offen" : lobby.status}
                </Badge>
              </div>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Date & Time */}
              <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-xl">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    {format(new Date(lobby.start_time), "EEEE, dd. MMMM yyyy", { locale: de })}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    {format(new Date(lobby.start_time), "HH:mm", { locale: de })} –{" "}
                    {format(new Date(lobby.end_time), "HH:mm 'Uhr'", { locale: de })}
                  </span>
                </div>
              </div>

              {/* Skill Range & Progress */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-yellow-500" />
                    <span className="text-sm">
                      Skill-Range: {lobby.skill_min}–{lobby.skill_max}
                    </span>
                  </div>
                  {lobby.avg_skill && (
                    <span className="text-sm text-muted-foreground">
                      Ø {lobby.avg_skill}
                    </span>
                  )}
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Teilnehmer</span>
                    <span className="font-medium">
                      {membersCount}/{lobby.capacity}
                      {freeSpots > 0 && (
                        <span className="text-primary ml-1">
                          ({freeSpots} frei)
                        </span>
                      )}
                    </span>
                  </div>
                  <Progress value={(membersCount / lobby.capacity) * 100} className="h-2" />
                </div>
              </div>

              {/* Members List */}
              <div className="space-y-3">
                <h3 className="font-medium flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Teilnehmer ({membersCount}/{lobby.capacity})
                </h3>

                <div className="space-y-2">
                  {members
                    .filter((m) => m.status !== "cancelled" && m.status !== "expired")
                    .map((member) => (
                      <MemberItem
                        key={member.id}
                        member={member}
                        isHost={member.user_id === lobby.host_user_id}
                        isSelf={member.user_id === user?.id}
                        friendStatus={friendStatusFor(member.user_id)}
                        onSendFriendRequest={handleSendFriendRequest}
                        sendingRequest={isSendingRequest && pendingTargetUserId === member.user_id}
                      />
                    ))}

                  {/* Empty slots */}
                  {Array.from({ length: freeSpots }).map((_, i) => (
                    <div
                      key={`empty-${i}`}
                      className="flex items-center gap-3 p-3 rounded-lg border border-dashed border-border/50 opacity-50"
                    >
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                        <UserPlus className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <span className="text-sm text-muted-foreground">
                        Freier Platz
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Description */}
              {lobby.description && (
                <div className="p-4 bg-muted/30 rounded-xl">
                  <p className="text-sm text-muted-foreground">{lobby.description}</p>
                </div>
              )}

              {/* Invites — visible to host + active members */}
              {canInvite && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      Eingeladene Freunde
                      {lobbyInvites.length > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {lobbyInvites.length}
                        </Badge>
                      )}
                    </h3>
                    {freeSpots > 0 && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setInviteDialogOpen(true)}
                      >
                        <UserPlus className="w-4 h-4 mr-1" />
                        Freunde einladen
                      </Button>
                    )}
                  </div>

                  {lobbyInvites.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-2">
                      Noch keine Einladungen verschickt.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {lobbyInvites.map((inv) => {
                        const statusLabel = {
                          pending: { label: "Ausstehend", variant: "outline" as const },
                          accepted: { label: "Angenommen", variant: "default" as const },
                          declined: { label: "Abgelehnt", variant: "secondary" as const },
                          cancelled: { label: "Zurückgezogen", variant: "secondary" as const },
                          expired: { label: "Abgelaufen", variant: "outline" as const },
                        }[inv.status];
                        const initials =
                          (inv.invitee?.display_name ||
                            inv.invitee?.username ||
                            "?")[0]?.toUpperCase() || "?";
                        return (
                          <div
                            key={inv.id}
                            className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/20"
                          >
                            <Avatar className="w-8 h-8">
                              <AvatarImage src={inv.invitee?.avatar_url || undefined} />
                              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {inv.invitee?.display_name || inv.invitee?.username || "Unbekannt"}
                              </p>
                              {inv.invitee?.username && inv.invitee?.display_name && (
                                <p className="text-xs text-muted-foreground truncate">
                                  @{inv.invitee.username}
                                </p>
                              )}
                            </div>
                            <Badge variant={statusLabel.variant} className="text-xs shrink-0">
                              {statusLabel.label}
                            </Badge>
                            {inv.status === "pending" && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:bg-destructive/10 shrink-0 h-8 w-8"
                                onClick={() => cancelInvite.mutate(inv.id)}
                                aria-label="Einladung zurückziehen"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Sticky Footer CTA */}
            <div className="p-6 border-t border-border bg-background">
              <p className="text-xs text-muted-foreground text-center mb-3">
                Der Host hat den Court bereits gebucht. Mitspielen ist kostenlos.
              </p>

              {canJoin && (
                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleJoin}
                  disabled={joinMutation.isPending}
                >
                  {joinMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Beitreten…
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4 mr-2" />
                      Lobby beitreten
                    </>
                  )}
                </Button>
              )}

              {canLeave && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleLeave}
                  disabled={leaveMutation.isPending}
                >
                  {leaveMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Lobby verlassen"
                  )}
                </Button>
              )}

              {lobby.status === "full" && !userMembership && !isHost && (
                <Button className="w-full" size="lg" disabled>
                  Lobby ist voll
                </Button>
              )}

              {isHost && (
                <p className="text-sm text-center text-muted-foreground mt-2 flex items-center justify-center gap-1.5">
                  Du bist der Host dieser Lobby
                  {lobby.is_private && (
                    <span className="inline-flex items-center gap-0.5 text-xs">
                      <Lock className="w-3 h-3" /> privat
                    </span>
                  )}
                </p>
              )}

              {userMembership && !isHost && (
                <div className="flex items-center justify-center gap-2 text-sm text-green-500 mt-2">
                  <CheckCircle className="w-4 h-4" />
                  Du bist dabei!
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            Lobby nicht gefunden
          </div>
        )}
      </SheetContent>
      {lobbyId && (
        <InviteFriendsDialog
          lobbyId={lobbyId}
          open={inviteDialogOpen}
          onOpenChange={setInviteDialogOpen}
        />
      )}
    </Sheet>
  );
}
