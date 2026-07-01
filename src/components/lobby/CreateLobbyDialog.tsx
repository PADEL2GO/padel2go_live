import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Loader2, Users, Globe, Lock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateLobby } from "@/hooks/useLobbies";

export interface BookingForLobby {
  id: string;
  location_id: string;
  court_id: string;
  start_time: string;
  end_time: string;
  price_cents: number;
  location_name?: string;
  court_name?: string;
}

interface CreateLobbyDialogProps {
  booking: BookingForLobby;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (lobbyId: string) => void;
}

export function CreateLobbyDialog({
  booking,
  open,
  onOpenChange,
  onCreated,
}: CreateLobbyDialogProps) {
  const { t } = useTranslation("social");
  const navigate = useNavigate();
  const createLobby = useCreateLobby();

  const [capacity, setCapacity] = useState<2 | 4>(4);
  // Skill range fixed to "any skill" (1–10) while skill ratings are inactive.
  // Re-enable the dynamic ±1 lookup + the UI picker once AI cameras are live.
  const [skillMin] = useState(1);
  const [skillMax] = useState(10);
  const [isPublic, setIsPublic] = useState(true);
  const [description, setDescription] = useState("");

  const handleSubmit = async () => {
    const lobby = await createLobby.mutateAsync({
      bookingId: booking.id,
      locationId: booking.location_id,
      courtId: booking.court_id,
      startTime: booking.start_time,
      endTime: booking.end_time,
      priceCents: booking.price_cents,
      capacity,
      skillMin,
      skillMax,
      isPublic,
      description: description.trim() || undefined,
    });
    onOpenChange(false);
    if (lobby?.id) {
      onCreated?.(lobby.id);
      navigate(`/lobbies/${lobby.id}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            {t("createLobbyDialog.title")}
          </DialogTitle>
          <DialogDescription>
            {booking.location_name && booking.court_name && (
              <>{booking.location_name} · {booking.court_name} · </>
            )}
            {t("createLobbyDialog.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Capacity */}
          <div>
            <Label htmlFor="capacity">{t("createLobbyDialog.playerCount")}</Label>
            <Select value={capacity.toString()} onValueChange={(v) => setCapacity(Number(v) as 2 | 4)}>
              <SelectTrigger id="capacity">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2">{t("createLobbyDialog.singles")}</SelectItem>
                <SelectItem value="4">{t("createLobbyDialog.doubles")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Skill-Range picker hidden pre-launch — skill ratings are inactive
              until AI cameras come online. The values still get sent to the
              backend at 1–10 (= any skill) via the state defaults below. */}

          {/* Public / Private */}
          <div className="flex items-start justify-between gap-3 p-3 rounded-lg border border-border bg-muted/30">
            <div className="flex items-start gap-3 flex-1">
              {isPublic ? (
                <Globe className="w-5 h-5 text-primary mt-0.5 shrink-0" />
              ) : (
                <Lock className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
              )}
              <div>
                <p className="font-medium text-sm">
                  {isPublic ? t("createLobbyDialog.public") : t("createLobbyDialog.private")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isPublic
                    ? t("createLobbyDialog.publicHint")
                    : t("createLobbyDialog.privateHint")}
                </p>
              </div>
            </div>
            <Switch checked={isPublic} onCheckedChange={setIsPublic} />
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="desc">{t("createLobbyDialog.descriptionLabel")}</Label>
            <Textarea
              id="desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("createLobbyDialog.descriptionPlaceholder")}
              rows={2}
              maxLength={500}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={createLobby.isPending || skillMin > skillMax}
          >
            {createLobby.isPending && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
            {t("createLobbyDialog.create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
