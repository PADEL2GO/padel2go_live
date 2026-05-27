import { useState, useEffect, useMemo, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import DashboardMetricCard from "@/components/dashboard/DashboardMetricCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LocationCard } from "@/components/booking/LocationCard";
import { LobbyActionButton } from "@/components/lobby";
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Loader2, 
  Mail, 
  Check, 
  X, 
  ChevronDown, 
  ChevronUp,
  Users,
  Rocket,
  Timer,
  CreditCard
} from "lucide-react";
import { format, isPast, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import type { DbLocation } from "@/types/database";
import { toast } from "sonner";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { NavLink } from "react-router-dom";
import { formatPrice } from "@/lib/pricing";
import { useWeeklyBookingStreak } from "@/hooks/useWeeklyBookingStreak";
import { getStreakLabel, getStreakColor, calculateBookingPoints } from "@/lib/bookingCredits";
import { Flame, Coins, Zap } from "lucide-react";

const useCountdown = (targetDate: string | null) => {
  const [countdownTimeLeft, setCountdownTimeLeft] = useState("");
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (!targetDate) { setIsExpired(false); setCountdownTimeLeft(""); return; }

    const tick = () => {
      const diff = new Date(targetDate).getTime() - Date.now();
      if (diff <= 0) { setIsExpired(true); setCountdownTimeLeft("00:00"); return; }
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setCountdownTimeLeft(`${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`);
      setIsExpired(false);
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetDate]);

  return { countdownTimeLeft, isExpired };
};

interface LocationWithAvailability extends DbLocation {
  todayFreeSlots: number;
  occupancyPercent: number;
  minPriceCents: number | null;
}

const LAUNCH_DATE = new Date("2026-07-01T00:00:00");

function calculateTimeLeft(targetDate: Date) {
  const diff = targetDate.getTime() - Date.now();
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

const DashboardBooking = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: streakData } = useWeeklyBookingStreak(user?.id);
  const weekStreak = streakData?.weekStreak ?? 0;
  const [locations, setLocations] = useState<LocationWithAvailability[]>([]);
  const [locationsLoading, setLocationsLoading] = useState(true);
  const [pastBookingsOpen, setPastBookingsOpen] = useState(false);
  const [visiblePastMonths, setVisiblePastMonths] = useState(3);
  const [timeLeft, setTimeLeft] = useState(() => calculateTimeLeft(LAUNCH_DATE));

  useEffect(() => {
    const timer = setInterval(() => setTimeLeft(calculateTimeLeft(LAUNCH_DATE)), 1000);
    return () => clearInterval(timer);
  }, []);
  // Fetch user bookings
  const { data: bookings, isLoading: bookingsLoading } = useQuery({
    queryKey: ["user-bookings", user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          *,
          location:locations(name, address, city),
          court:courts(name)
        `)
        .eq("user_id", user.id)
        .order("start_time", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });


  // Fetch locations with availability
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const { data: locationsData, error } = await supabase
          .from("locations")
          .select("*")
          .eq("is_online", true);

        if (error) throw error;

        const { data: globalPrice } = await supabase
          .from("court_prices")
          .select("price_cents")
          .is("court_id", null)
          .eq("duration_minutes", 60)
          .maybeSingle();

        const globalMinPrice = globalPrice?.price_cents ?? null;

        const today = new Date();
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const todayName = dayNames[today.getDay()];

        const locationsWithAvailability = await Promise.all(
          (locationsData || []).map(async (loc) => {
            const hours = (loc.opening_hours_json as Record<string, { open: string; close: string } | undefined>)?.[todayName];

            const { data: courts } = await supabase
              .from("courts")
              .select("id")
              .eq("location_id", loc.id)
              .eq("is_active", true);

            const courtIds = courts?.map(c => c.id) || [];

            let minPriceCents: number | null = globalMinPrice;
            if (courtIds.length > 0) {
              const { data: courtPrices } = await supabase
                .from("court_prices")
                .select("price_cents")
                .in("court_id", courtIds)
                .eq("duration_minutes", 60)
                .order("price_cents", { ascending: true })
                .limit(1);

              if (courtPrices && courtPrices.length > 0) {
                minPriceCents = courtPrices[0].price_cents;
              }
            }

            if (!hours) {
              return { ...loc, todayFreeSlots: 0, occupancyPercent: 0, minPriceCents };
            }

            const [openHour, openMin] = hours.open.split(':').map(Number);
            const [closeHour, closeMin] = hours.close.split(':').map(Number);
            const totalMinutes = (closeHour * 60 + closeMin) - (openHour * 60 + openMin);
            const totalSlots = Math.floor(totalMinutes / 60);

            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);
            const todayEnd = new Date();
            todayEnd.setHours(23, 59, 59, 999);

            const { data: existingBookings } = await supabase
              .from("bookings")
              .select("start_time, end_time")
              .in("court_id", courtIds.length > 0 ? courtIds : [''])
              .in("status", ["pending", "confirmed"])
              .gte("start_time", todayStart.toISOString())
              .lte("end_time", todayEnd.toISOString());

            const bookedMinutes = (existingBookings || []).reduce((sum, b) => {
              const start = new Date(b.start_time);
              const end = new Date(b.end_time);
              return sum + (end.getTime() - start.getTime()) / 60000;
            }, 0);

            const courtsCount = courtIds.length || 1;
            const totalAvailableMinutes = totalMinutes * courtsCount;
            const occupancyPercent = Math.round((bookedMinutes / totalAvailableMinutes) * 100);
            const freeSlots = Math.max(0, (totalSlots * courtsCount) - Math.ceil(bookedMinutes / 60));

            return {
              ...loc,
              todayFreeSlots: freeSlots,
              occupancyPercent: Math.min(100, occupancyPercent),
              minPriceCents,
            };
          })
        );

        setLocations(locationsWithAvailability as LocationWithAvailability[]);
      } catch (error) {
        console.error("Error fetching locations:", error);
      } finally {
        setLocationsLoading(false);
      }
    };

    fetchLocations();
  }, []);

  const upcomingBookings = bookings?.filter(b => {
    if (isPast(parseISO(b.start_time))) return false;
    if (b.status === "cancelled") return false;
    // Filter out expired pending_payment holds
    if (b.status === "pending_payment" && b.hold_expires_at && new Date(b.hold_expires_at) <= new Date()) return false;
    return true;
  }) || [];
  
  const pastBookings = bookings?.filter(b => 
    isPast(parseISO(b.start_time)) || b.status === "cancelled"
  ).reverse() || [];

  // Group past bookings by month
  const groupedPastBookings = useMemo(() => {
    const groups: Record<string, typeof pastBookings> = {};
    
    pastBookings.forEach(booking => {
      const monthKey = format(parseISO(booking.start_time), "MMMM yyyy", { locale: de });
      if (!groups[monthKey]) {
        groups[monthKey] = [];
      }
      groups[monthKey].push(booking);
    });

    return Object.entries(groups);
  }, [pastBookings]);

  const visibleGroupedPastBookings = groupedPastBookings.slice(0, visiblePastMonths);
  const hasMorePastMonths = groupedPastBookings.length > visiblePastMonths;

  const nextBooking = upcomingBookings[0];

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      confirmed: { variant: "default", label: "Bestätigt" },
      pending: { variant: "secondary", label: "Ausstehend" },
      pending_payment: { variant: "outline", label: "Zahlung ausstehend" },
      cancelled: { variant: "destructive", label: "Storniert" },
      expired: { variant: "destructive", label: "Abgelaufen" },
    };
    const config = variants[status] || { variant: "secondary", label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <DashboardLayout>
      <Helmet>
        <title>Booking | Padel2Go Dashboard</title>
      </Helmet>

      <div className="container mx-auto px-4 py-6 md:py-8 space-y-6 md:space-y-8">
        {/* Hero Booking Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-primary/20 via-background to-primary/5 border border-primary/20 p-6 md:p-8"
        >
          <div className="absolute inset-0 bg-grid-pattern opacity-5" />
          <div className="relative z-10">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
              Buche deinen nächsten <span className="text-primary">Court</span>
            </h1>
            <p className="text-muted-foreground mb-4 max-w-lg">
              Wähle einen unserer Standorte und reserviere deinen Slot in Sekunden.
            </p>

            {/* Streak + Points Banner */}
            <div className="flex flex-wrap gap-2 mb-4">
              <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold border ${
                weekStreak >= 4 ? "bg-orange-500/10 border-orange-500/30 text-orange-400" :
                weekStreak >= 2 ? "bg-amber-500/10 border-amber-500/30 text-amber-400" :
                "bg-primary/10 border-primary/20 text-primary"
              }`}>
                <Flame className="w-4 h-4" />
                {weekStreak === 0
                  ? "Starte deine Wochenserie!"
                  : `${weekStreak} ${weekStreak === 1 ? "Woche" : "Wochen"} in Folge`}
                {weekStreak >= 2 && (
                  <span className="ml-1 font-bold">{getStreakLabel(weekStreak)} Multiplikator</span>
                )}
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold bg-primary/10 border border-primary/20 text-primary">
                <Coins className="w-4 h-4" />
                {weekStreak >= 2
                  ? `${Math.round(100 * (streakData?.multiplier ?? 1))} Punkte / Stunde`
                  : "100 Punkte / Stunde"}
              </div>
              {streakData?.multiplierWillIncrease && (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold bg-green-500/10 border border-green-500/20 text-green-400">
                  <Zap className="w-4 h-4" />
                  Nächste Woche: {getStreakLabel(weekStreak + 1)}
                </div>
              )}
            </div>

            {nextBooking && (
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm mb-4">
                <Calendar className="w-4 h-4" />
                Nächste Buchung: {format(parseISO(nextBooking.start_time), "EEEE, d. MMMM 'um' HH:mm 'Uhr'", { locale: de })}
              </div>
            )}
          </div>
        </motion.div>

        {/* Locations Grid */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              Unsere Standorte
            </h2>
          </div>

          {locationsLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : locations.length === 0 ? (
            <Card className="bg-card/50 backdrop-blur-sm border-border/50">
              <CardContent className="py-12 text-center space-y-6">
                <Rocket className="w-12 h-12 mx-auto text-primary" />
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-1">Wir starten bald!</h3>
                  <p className="text-muted-foreground">Unsere Standorte gehen am 14. März 2026 live.</p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-3 md:gap-5">
                  {[
                    { value: timeLeft.days, label: "Tage" },
                    { value: timeLeft.hours, label: "Std" },
                    { value: timeLeft.minutes, label: "Min" },
                    { value: timeLeft.seconds, label: "Sek" },
                  ].map((unit) => (
                    <div key={unit.label} className="flex flex-col items-center">
                      <span className="text-3xl md:text-4xl font-bold tabular-nums text-primary">
                        {String(unit.value).padStart(2, "0")}
                      </span>
                      <span className="text-xs uppercase tracking-wider text-muted-foreground">{unit.label}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {locations.map((location, index) => (
                <LocationCard
                  key={location.id}
                  location={location}
                  todayFreeSlots={location.todayFreeSlots}
                  occupancyPercent={location.occupancyPercent}
                  index={index}
                  minPriceCents={location.minPriceCents}
                />
              ))}
            </div>
          )}
        </section>

        {/* Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <DashboardMetricCard
            title="Kommende Buchungen"
            value={upcomingBookings.length}
            icon={Calendar}
          />
          <DashboardMetricCard
            title="Vergangene Buchungen"
            value={pastBookings.length}
            icon={Clock}
          />
          {nextBooking && (
            <DashboardMetricCard
              title="Nächste Buchung"
              value={format(parseISO(nextBooking.start_time), "d. MMM", { locale: de })}
              icon={MapPin}
              subtitle={(nextBooking.location as any)?.name || ""}
            />
          )}
        </div>

        {bookingsLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Upcoming Bookings */}
            <Card className="bg-card/50 backdrop-blur-sm border-border/50">
              <CardHeader>
                <CardTitle className="text-lg">Kommende Buchungen</CardTitle>
              </CardHeader>
              <CardContent>
                {upcomingBookings.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    Keine kommenden Buchungen
                  </p>
                ) : (
                  <div className="space-y-3">
                    {upcomingBookings.map((booking) => (
                      <UpcomingBookingCard key={booking.id} booking={booking} getStatusBadge={getStatusBadge} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Past Bookings - Collapsible by Month */}
            <Collapsible open={pastBookingsOpen} onOpenChange={setPastBookingsOpen}>
              <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors rounded-t-xl">
                    <CardTitle className="text-lg flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        Vergangene Buchungen
                        <Badge variant="secondary">{pastBookings.length}</Badge>
                      </span>
                      {pastBookingsOpen ? (
                        <ChevronUp className="w-5 h-5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-muted-foreground" />
                      )}
                    </CardTitle>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent>
                    {pastBookings.length === 0 ? (
                      <p className="text-muted-foreground text-center py-8">
                        Keine vergangenen Buchungen
                      </p>
                    ) : (
                      <div className="space-y-6">
                        <AnimatePresence>
                          {visibleGroupedPastBookings.map(([monthKey, monthBookings]) => (
                            <motion.div
                              key={monthKey}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                            >
                              <h3 className="text-sm font-semibold text-muted-foreground mb-3 capitalize">
                                {monthKey}
                              </h3>
                              <div className="space-y-2">
                                {monthBookings.map((booking) => (
                                  <div
                                    key={booking.id}
                                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg bg-background/30 border border-border/20 gap-2 opacity-75"
                                  >
                                    <div className="flex items-center gap-3">
                                      <div className="flex items-center gap-2">
                                        <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                                        <span className="text-sm text-muted-foreground">
                                          {format(parseISO(booking.start_time), "d. MMM", { locale: de })}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                                        <span className="text-sm text-muted-foreground">
                                          {(booking.location as any)?.name}
                                        </span>
                                      </div>
                                    </div>
                                    {getStatusBadge(booking.status)}
                                  </div>
                                ))}
                              </div>
                            </motion.div>
                          ))}
                        </AnimatePresence>

                        {hasMorePastMonths && (
                          <Button
                            variant="ghost"
                            className="w-full"
                            onClick={() => setVisiblePastMonths(prev => prev + 3)}
                          >
                            Mehr anzeigen
                            <ChevronDown className="w-4 h-4 ml-2" />
                          </Button>
                        )}
                      </div>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

const UpcomingBookingCard = ({ booking, getStatusBadge }: { booking: any; getStatusBadge: (s: string) => React.ReactNode }) => {
  const isPending = booking.status === "pending_payment";
  const { countdownTimeLeft, isExpired } = useCountdown(isPending ? booking.hold_expires_at : null);

  if (isPending && isExpired) return null;

  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl gap-3 ${
        isPending
          ? "bg-amber-500/10 border border-amber-500/30"
          : "bg-background/50 border border-border/30"
      }`}
    >
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-primary" />
          <span className="font-medium">
            {format(parseISO(booking.start_time), "EEEE, d. MMMM yyyy", { locale: de })}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="w-4 h-4" />
          <span>
            {format(parseISO(booking.start_time), "HH:mm")} - {format(parseISO(booking.end_time), "HH:mm")} Uhr
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="w-4 h-4" />
          <span>
            {(booking.location as any)?.name} • {(booking.court as any)?.name}
          </span>
        </div>
        {isPending && countdownTimeLeft && (
          <p className="mt-1 text-xs font-medium text-amber-400 flex items-center gap-1">
            <Timer className="w-3 h-3" />
            Reserviert — {countdownTimeLeft} verbleibend
          </p>
        )}
      </div>
      <div className="flex flex-col items-end gap-2">
        <div className="flex items-center gap-3">
          {booking.price_cents && (
            <span className="text-sm font-medium">
              {formatPrice(booking.price_cents, booking.currency || 'EUR')}
            </span>
          )}
          {isPending ? (
            <Button variant="lime" size="sm" asChild>
              <NavLink to={`/booking/checkout?booking_id=${booking.id}`}>
                <CreditCard className="w-4 h-4 mr-1" />
                Jetzt bezahlen
              </NavLink>
            </Button>
          ) : (
            getStatusBadge(booking.status)
          )}
        </div>
        {!isPending && booking.status === "confirmed" && booking.location_id && booking.court_id && (
          <LobbyActionButton
            booking={{
              id: booking.id,
              location_id: booking.location_id,
              court_id: booking.court_id,
              start_time: booking.start_time,
              end_time: booking.end_time,
              price_cents: booking.price_cents || 0,
              location_name: (booking.location as any)?.name,
              court_name: (booking.court as any)?.name,
            }}
            variant="outline"
          />
        )}
        {(booking as any).play_credits_awarded > 0 ? (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
            <Coins className="w-3 h-3" />
            +{(booking as any).play_credits_awarded} Punkte verdient
          </span>
        ) : booking.status === "confirmed" ? (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Coins className="w-3 h-3" />
            +{calculateBookingPoints(booking.start_time, booking.end_time, 0)} Punkte
          </span>
        ) : null}
      </div>
    </div>
  );
};

export default DashboardBooking;
