import { useMemo, useState } from "react";
import { addMonths, startOfMonth, isSameMonth } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Percent,
  CalendarRange,
  Activity,
  TrendingUp,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  useCourtUtilization,
  useCourtUtilizationTrend,
} from "@/hooks/useCourtUtilization";
import {
  monthStartISO,
  formatMonthLabel,
  minutesToHours,
  formatHours,
  capacityTextClass,
} from "@/lib/utilization";

const TOOLTIP_STYLE = {
  backgroundColor: "hsl(0, 0%, 5%)",
  border: "1px solid hsl(0, 0%, 15%)",
  borderRadius: "8px",
} as const;

export default function ClubUtilization() {
  const today = startOfMonth(new Date());
  const [month, setMonth] = useState<Date>(today);
  const [trendCourtId, setTrendCourtId] = useState<string | null>(null);

  const monthISO = monthStartISO(month);
  const { data: rows = [], isLoading, isError } = useCourtUtilization(monthISO);

  const isCurrentMonth = isSameMonth(month, today);

  const totals = useMemo(() => {
    const booked = rows.reduce((s, r) => s + r.booked_minutes, 0);
    const possible = rows.reduce((s, r) => s + r.possible_minutes, 0);
    const bookings = rows.reduce((s, r) => s + r.bookings_count, 0);
    const capacity = possible > 0 ? Math.round((1000 * booked) / possible) / 10 : 0;
    return { booked, possible, bookings, capacity };
  }, [rows]);

  const activeTrendCourt = trendCourtId ?? rows[0]?.court_id ?? null;
  const { data: trend = [] } = useCourtUtilizationTrend(activeTrendCourt, 6);
  const trendData = trend.map((p) => ({
    label: formatMonthLabel(p.month_start, true),
    capacity: p.capacity_pct,
    hours: minutesToHours(p.booked_minutes),
  }));

  const kpis = [
    { title: "Gebuchte Stunden", value: formatHours(totals.booked), icon: Clock,
      desc: formatMonthLabel(month) },
    { title: "Auslastung", value: `${Math.min(totals.capacity, 100)}%`, icon: Percent,
      desc: "Gebucht ÷ mögliche Öffnungsstunden" },
    { title: "Mögliche Stunden", value: formatHours(totals.possible), icon: CalendarRange,
      desc: "Laut Öffnungszeiten" },
    { title: "Buchungen", value: totals.bookings, icon: Activity,
      desc: `${rows.length} Court${rows.length === 1 ? "" : "s"}` },
  ];

  return (
    <div className="space-y-6">
      {/* Header + month selector */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Auslastung</h1>
          <p className="text-muted-foreground">
            Gebuchte Stunden und Kapazität eurer Courts pro Monat
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setMonth((m) => addMonths(m, -1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-[140px] text-center font-medium capitalize">
            {formatMonthLabel(month)}
          </span>
          <Button
            variant="outline"
            size="icon"
            disabled={isCurrentMonth}
            onClick={() => setMonth((m) => addMonths(m, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((card) => (
          <Card key={card.title} className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <card.icon className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{card.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{card.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Per-court breakdown */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Percent className="h-5 w-5 text-primary" />
            Auslastung pro Court
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {isLoading ? (
            <p className="text-muted-foreground text-sm">Lädt…</p>
          ) : isError ? (
            <p className="text-destructive text-sm">
              Auslastungsdaten konnten nicht geladen werden. Bitte lade die Seite neu.
            </p>
          ) : rows.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Diesem Konto sind keine Courts zugewiesen.
            </p>
          ) : (
            rows.map((r) => (
              <div key={r.court_id} className="space-y-2">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <p className="font-semibold text-foreground">{r.court_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.location_name}
                      {r.location_city ? ` · ${r.location_city}` : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`text-2xl font-bold ${capacityTextClass(r.capacity_pct)}`}>
                      {Math.min(r.capacity_pct, 100)}%
                    </span>
                    <p className="text-xs text-muted-foreground">
                      {formatHours(r.booked_minutes)} / {formatHours(r.possible_minutes)} · {r.bookings_count} Buchungen
                    </p>
                  </div>
                </div>
                <Progress value={Math.min(r.capacity_pct, 100)} className="h-2" />
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Trend */}
      {rows.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2 text-foreground">
              <TrendingUp className="h-5 w-5 text-primary" />
              Verlauf (letzte 6 Monate bis heute)
            </CardTitle>
            {rows.length > 1 && (
              <Select
                value={activeTrendCourt ?? undefined}
                onValueChange={(v) => setTrendCourtId(v)}
              >
                <SelectTrigger className="w-full sm:w-[220px]">
                  <SelectValue placeholder="Court wählen" />
                </SelectTrigger>
                <SelectContent>
                  {rows.map((r) => (
                    <SelectItem key={r.court_id} value={r.court_id}>
                      {r.court_name} · {r.location_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(0, 0%, 15%)" />
                  <XAxis dataKey="label" stroke="hsl(0, 0%, 65%)" fontSize={12} />
                  <YAxis stroke="hsl(0, 0%, 65%)" fontSize={12} unit="%" />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    labelStyle={{ color: "hsl(0, 0%, 98%)" }}
                    formatter={(value: number, name: string) =>
                      name === "capacity" ? [`${value}%`, "Auslastung"] : [`${value} h`, "Stunden"]
                    }
                  />
                  <Line
                    type="monotone"
                    dataKey="capacity"
                    stroke="hsl(71, 91%, 51%)"
                    strokeWidth={2}
                    dot={{ fill: "hsl(71, 91%, 51%)" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
