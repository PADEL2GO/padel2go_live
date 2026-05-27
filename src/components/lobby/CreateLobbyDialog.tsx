import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Users, Zap, Globe, Lock } from "lucide-react";
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
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
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
  const { user } = useAuth();
  const navigate = useNavigate();
  const createLobby = useCreateLobby();

  const [capacity, setCapacity] = useState<2 | 4>(4);
  const [skillMin, setSkillMin] = useState(4);
  const [skillMax, setSkillMax] = useState(6);
  const [isPublic, setIsPublic] = useState(true);
  const [description, setDescription] = useState("");

  // Default skill range = ±1 around user level
  useEffect(() => {
    if (!user || !open) return;
    supabase
      .from("skill_stats")
      .select("skill_level")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        const lvl = data?.skill_level ?? 5;
        setSkillMin(Math.max(1, lvl - 1));
        setSkillMax(Math.min(10, lvl + 1));
      });
  }, [user, open]);

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
            Lobby erstellen
          </DialogTitle>
          <DialogDescription>
            {booking.location_name && booking.court_name && (
              <>{booking.location_name} · {booking.court_name} · </>
            )}
            Du hast den Court bereits gebucht. Eingeladene Freunde und beitretende Spieler spielen kostenlos mit.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Capacity */}
          <div>
            <Label htmlFor="capacity">Spieleranzahl</Label>
            <Select value={capacity.toString()} onValueChange={(v) => setCapacity(Number(v) as 2 | 4)}>
              <SelectTrigger id="capacity">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2">Singles (2 Spieler)</SelectItem>
                <SelectItem value="4">Doubles (4 Spieler)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Skill Range */}
          <div>
            <Label className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-yellow-500" />
              Skill-Range
            </Label>
            <div className="flex items-center gap-2">
              <Select value={skillMin.toString()} onValueChange={(v) => setSkillMin(Number(v))}>
                <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[1,2,3,4,5,6,7,8,9,10].map(n => (
                    <SelectItem key={n} value={n.toString()}>{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-muted-foreground">bis</span>
              <Select value={skillMax.toString()} onValueChange={(v) => setSkillMax(Number(v))}>
                <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[1,2,3,4,5,6,7,8,9,10].map(n => (
                    <SelectItem key={n} value={n.toString()}>{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Nur Spieler mit Skill in diesem Bereich können beitreten.
            </p>
          </div>

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
                  {isPublic ? "Öffentlich" : "Privat"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isPublic
                    ? "Alle Spieler sehen die Lobby unter Offene Lobbys."
                    : "Nur eingeladene Freunde sehen die Lobby."}
                </p>
              </div>
            </div>
            <Switch checked={isPublic} onCheckedChange={setIsPublic} />
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="desc">Beschreibung (optional)</Label>
            <Textarea
              id="desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="z. B. Locker spielen, alle Skills willkommen"
              rows={2}
              maxLength={500}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Abbrechen
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={createLobby.isPending || skillMin > skillMax}
          >
            {createLobby.isPending && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
            Lobby erstellen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
