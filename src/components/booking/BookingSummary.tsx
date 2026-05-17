import { Loader2, ArrowRight, CheckCircle, Users, AlertTriangle, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import type { Court, TimeSlot } from "./types";
import type { DbLocation } from "@/types/database";
import type { LobbySettings } from "@/types/lobby";
import { formatPrice } from "@/lib/pricing";

interface BookingSummaryProps {
  location: DbLocation;
  courts: Court[];
  selectedCourt: string | null;
  selectedDate: Date;
  selectedDuration: number;
  selectedSlot: TimeSlot | null;
  booking: boolean;
  user: any;
  onBook: () => void;
  priceCents: number | null;
  hasPrices?: boolean;
  // Lobby settings
  lobbyEnabled?: boolean;
  onLobbyEnabledChange?: (enabled: boolean) => void;
  lobbySettings?: LobbySettings;
  onLobbySettingsChange?: (settings: LobbySettings) => void;
  userSkillLevel?: number;
  // Feature toggle
  lobbiesFeatureEnabled?: boolean;
}

export function BookingSummary({
  location,
  courts,
  selectedCourt,
  selectedDate,
  selectedDuration,
  selectedSlot,
  booking,
  user,
  onBook,
  priceCents,
  hasPrices = true,
  lobbyEnabled = false,
  onLobbyEnabledChange,
  lobbySettings,
  onLobbySettingsChange,
  userSkillLevel = 5,
  lobbiesFeatureEnabled = false,
}: BookingSummaryProps) {
  // Lobby price per player
  const lobbyPricePerPlayer = priceCents && lobbySettings 
    ? Math.round(priceCents / lobbySettings.capacity) 
    : 0;

  return (
    <div className="lg:col-span-1">
      <div className="bg-card border border-border rounded-2xl p-6 sticky top-24 space-y-6">
        <h2 className="text-lg font-semibold">Buchungsübersicht</h2>
        
        <div className="space-y-4">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Standort</span>
            <span className="font-medium">{location.name}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Court</span>
            <span className="font-medium">
              {courts.find(c => c.id === selectedCourt)?.name || '-'}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Datum</span>
            <span className="font-medium">
              {format(selectedDate, "dd.MM.yyyy", { locale: de })}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Dauer</span>
            <span className="font-medium">{selectedDuration} Minuten</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Uhrzeit</span>
            <span className="font-medium">
              {selectedSlot ? `${selectedSlot.time} Uhr` : '-'}
            </span>
          </div>
        </div>

        {/* Lobby Toggle Section */}
        {user && selectedSlot && onLobbyEnabledChange && onLobbySettingsChange && lobbySettings && (
          <div className="border-t border-border pt-4">
            <label className={`flex items-center justify-between ${lobbiesFeatureEnabled ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
              <div className="flex items-center gap-2">
                <Users className={`w-4 h-4 ${lobbiesFeatureEnabled ? 'text-primary' : 'text-muted-foreground'}`} />
                <span className={`text-sm font-medium ${!lobbiesFeatureEnabled ? 'text-muted-foreground' : ''}`}>Als Lobby öffnen</span>
                {!lobbiesFeatureEnabled && (
                  <span className="text-[10px] font-semibold bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                    COMING SOON
                  </span>
                )}
              </div>
              <Switch
                checked={lobbiesFeatureEnabled ? lobbyEnabled : false}
                onCheckedChange={lobbiesFeatureEnabled ? onLobbyEnabledChange : undefined}
                disabled={!lobbiesFeatureEnabled}
                className={!lobbiesFeatureEnabled ? 'opacity-50' : ''}
              />
            </label>
            <p className="text-xs text-muted-foreground mt-1">
              {lobbiesFeatureEnabled 
                ? "Andere Spieler können beitreten und ihren Anteil zahlen"
                : "Dieses Feature ist bald verfügbar"}
            </p>
            
            {lobbiesFeatureEnabled && lobbyEnabled && (
              <div className="mt-4 space-y-4 p-4 bg-muted/50 rounded-lg">
                {/* Player Count */}
                <div>
                  <label className="text-xs text-muted-foreground block mb-1.5">Spieleranzahl</label>
                  <Select 
                    value={lobbySettings.capacity.toString()} 
                    onValueChange={(v) => onLobbySettingsChange({ 
                      ...lobbySettings, 
                      capacity: Number(v) as 2 | 4 
                    })}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2">Singles (2 Spieler)</SelectItem>
                      <SelectItem value="4">Doubles (4 Spieler)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Skill Range Display */}
                <div className="flex items-center gap-2 text-sm">
                  <Zap className="w-4 h-4 text-yellow-500" />
                  <span className="text-muted-foreground">
                    Skill-Range: {lobbySettings.skillRange[0]}–{lobbySettings.skillRange[1]}
                  </span>
                  <span className="text-xs text-muted-foreground/70">
                    (±1 um dein Level)
                  </span>
                </div>
                
                {/* Price Per Player */}
                <div className="flex items-center justify-between text-sm pt-2 border-t border-border/50">
                  <span className="text-muted-foreground">Preis pro Spieler</span>
                  <span className="font-semibold text-primary">
                    {formatPrice(lobbyPricePerPlayer, "EUR")}
                  </span>
                </div>
                
                {/* Public Toggle */}
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-xs text-muted-foreground">Öffentlich sichtbar</span>
                  <Switch
                    checked={lobbySettings.isPublic}
                    onCheckedChange={(checked) => onLobbySettingsChange({
                      ...lobbySettings,
                      isPublic: checked,
                    })}
                  />
                </label>
              </div>
            )}
          </div>
        )}

        {/* Price Display */}
        <div className="border-t border-border pt-4">
          {!hasPrices ? (
            <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
              <p className="text-sm text-amber-400">
                Für diesen Court sind noch keine Preise konfiguriert.
              </p>
            </div>
          ) : (
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Gesamtpreis</span>
              <span className="font-bold text-lg text-primary">
                {formatPrice(priceCents!, "EUR")}
              </span>
            </div>
          )}
        </div>

        {selectedSlot && (
          <div className="bg-primary/10 border border-primary/20 rounded-xl p-4">
            <div className="flex items-center gap-2 text-primary mb-2">
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">Slot verfügbar</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {selectedSlot.courtName} • {format(selectedDate, "dd.MM.", { locale: de })} • {selectedSlot.time} Uhr
            </p>
          </div>
        )}

        <Button
          onClick={onBook}
          disabled={!selectedSlot || booking || !hasPrices}
          variant="lime"
          className="w-full"
          size="lg"
        >
          {booking ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Wird gebucht...
            </>
          ) : (
            <>
              Jetzt buchen
              <ArrowRight className="w-4 h-4 ml-2" />
            </>
          )}
        </Button>

        {!user && (
          <p className="text-xs text-muted-foreground text-center">
            Buchung ohne Konto möglich — oder{" "}
            <a href="/auth" className="text-primary hover:underline">anmelden</a>{" "}
            für Punkte & Vorteile.
          </p>
        )}
      </div>
    </div>
  );
}
