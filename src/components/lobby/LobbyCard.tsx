import { format } from "date-fns";
import { de, enUS } from "date-fns/locale";
import { Calendar, MapPin, Users, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ProfileLink } from "@/components/profile/ProfileLink";
import type { Lobby } from "@/types/lobby";

interface LobbyCardProps {
  lobby: Lobby;
  index?: number;
}

export function LobbyCard({ lobby, index = 0 }: LobbyCardProps) {
  const { t, i18n } = useTranslation("social");
  const dateLocale = i18n.language === "en" ? enUS : de;
  const navigate = useNavigate();
  const membersCount = lobby.members_count || 0;
  const progressPercent = (membersCount / lobby.capacity) * 100;
  const spotsLeft = lobby.capacity - membersCount;

  // Active members (filter cancelled/expired)
  const activeMembers = (lobby.members ?? []).filter(
    (m) => m.status === "paid" || m.status === "joined" || m.status === "reserved",
  );
  const displayedMembers = activeMembers.slice(0, 3);
  const extraMemberCount = Math.max(0, activeMembers.length - displayedMembers.length);

  const statusBadge = {
    open: { label: t("lobbyCard.status.open"), variant: "default" as const },
    full: { label: t("lobbyCard.status.full"), variant: "secondary" as const },
    cancelled: { label: t("lobbyCard.status.cancelled"), variant: "destructive" as const },
    expired: { label: t("lobbyCard.status.expired"), variant: "outline" as const },
    completed: { label: t("lobbyCard.status.completed"), variant: "outline" as const },
  };

  const { label, variant } = statusBadge[lobby.status] || statusBadge.open;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card className="overflow-hidden hover:border-primary/50 transition-all duration-200 group">
        {/* Header with gradient background */}
        <div className="relative h-28 bg-gradient-to-br from-primary/20 via-primary/10 to-background p-4">
          <Badge 
            variant={variant}
            className="absolute top-3 right-3"
          >
            {label}
          </Badge>
          
          <div className="absolute bottom-3 left-4">
            <p className="font-semibold text-foreground">
              {lobby.locations?.name || t("lobbyCard.locationFallback")}
            </p>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {lobby.courts?.name || t("lobbyCard.courtFallback")}
            </p>
          </div>
        </div>

        <CardContent className="p-4 space-y-4">
          {/* Date/Time */}
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span>
              {format(new Date(lobby.start_time), t("lobbyCard.dateFormat"), { locale: dateLocale })}
            </span>
          </div>

          {/* Participants Progress */}
          <div>
            <div className="flex justify-between text-sm mb-1.5">
              <span className="text-muted-foreground">{t("lobbyCard.participants")}</span>
              <span className="font-medium">
                {membersCount}/{lobby.capacity}
                {spotsLeft > 0 && (
                  <span className="text-muted-foreground ml-1">
                    {t("lobbyCard.spotsLeft", { count: spotsLeft })}
                  </span>
                )}
              </span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>

          {/* Skill ratings are disabled until AI cameras are live — show the
              privat badge alone for now without the skill row. */}
          {lobby.is_private && (
            <div className="flex items-center">
              <Badge variant="outline" className="ml-auto text-[10px] gap-1">
                <Lock className="w-2.5 h-2.5" />
                {t("lobbyCard.private")}
              </Badge>
            </div>
          )}

          {/* Member names (top 3 + +N) */}
          {displayedMembers.length > 0 && (
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                {displayedMembers.map((m) => (
                  <ProfileLink
                    key={m.id}
                    username={m.profiles?.username}
                    stopPropagation
                    ariaLabel={t("lobbyCard.profileAria", { name: m.profiles?.display_name || m.profiles?.username || t("common.player") })}
                  >
                    <Avatar
                      className="w-7 h-7 ring-2 ring-card"
                      title={m.profiles?.display_name || m.profiles?.username || t("common.player")}
                    >
                      <AvatarImage src={m.profiles?.avatar_url || undefined} />
                      <AvatarFallback className="text-[10px]">
                        {(m.profiles?.display_name || m.profiles?.username || "?")[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </ProfileLink>
                ))}
                {extraMemberCount > 0 && (
                  <div className="w-7 h-7 rounded-full bg-muted ring-2 ring-card flex items-center justify-center text-[10px] font-medium text-muted-foreground">
                    +{extraMemberCount}
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {displayedMembers
                  .map((m) => m.profiles?.display_name?.split(" ")[0] || m.profiles?.username || t("common.player"))
                  .join(", ")}
                {extraMemberCount > 0 && ` +${extraMemberCount}`}
              </p>
            </div>
          )}

          {/* CTA — joining is free, host covers the court */}
          <div className="flex items-center justify-between pt-3 border-t border-border">
            <p className="text-xs text-muted-foreground">
              {t("lobbyCard.joinFree")}
            </p>
            <Button
              size="sm"
              onClick={() => navigate(`/lobbies/${lobby.id}`)}
              disabled={lobby.status !== "open"}
            >
              <Users className="w-4 h-4 mr-1" />
              {t("lobbyCard.details")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
