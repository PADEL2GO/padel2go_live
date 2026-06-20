import { useMemo, useState } from "react";
import { addMonths, startOfMonth, isSameMonth } from "date-fns";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ChevronLeft,
  ChevronRight,
  MapPin,
  Percent,
  Clock,
  Euro,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  useCourtUtilization,
  useNetworkUtilizationTrend,
} from "@/hooks/useCourtUtilization";
import {
  monthStartISO,
  formatMonthLabel,
  minutesToHours,
  formatHours,
  capacityHex,
  capacityTextClass,
} from "@/lib/utilization";

const TOOLTIP_STYLE = {
  backgroundColor: "hsl(0, 0%, 5%)",
  border: "1px solid hsl(0, 0%, 15%)",
  borderRadius: "8px",
} as const;

function formatEuros(cents: number): string {
  return (cents / 100).toLocaleString("de-DE", { style: "currency", currency: "EUR" });
}

type SortKey = "capacity" | "booked" | "revenue" | "name";

export default function AdminUtilization() {
  const today = startOfMonth(new Date());
  const [month, setMonth] = useState<Date>(today);
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("capacity");

  const monthISO = monthStartISO(month);
  const { data: rows = [], isLoading } = useCourtUtilization(monthISO);
  const { data: networkTrend = [] } = useNetworkUtilizationTrend(6);

  const isCurrentMonth = isSameMonth(month, today);

  const locations = useMemo(
    () => Array.from(new Set(rows.map((r) => r.location_name))).sort(),
    [rows],
  );

  const visibleRows = useMemo(() => {
    const filtered =
      locationFilter === "all" ? rows : rows.filter((r) => r.location_name === locationFilter);
    const sorted = [...filtered];
    sorted.sort((a, b) => {
      switch (sortKey) {
        case "booked":
          return b.booked_minutes - a.booked_minutes;
        case "revenue":
          return b.revenue_cents - a.revenue_cents;
        case "name":
          return (
            a.location_name.localeCompare(b.location_name) ||
            a.court_name.localeCompare(b.court_name)
          );
        default:
          return b.capacity_pct - a.capacity_pct;
      }
    });
    return sorted;
  }, [rows, locationFilter, sortKey]);

  const totals = useMemo(() => {
    const booked = rows.reduce((s, r) => s + r.booked_minutes, 0);
    const possible = rows.reduce((s, r) => s + r.possible_minutes, 0);
    const revenue = rows.reduce((s, r) => s + r.revenue_cents, 0);
    const capacity = possible > 0 ? Math.round((1000 * booked) / possible) / 10 : 0;
    const ranked = rows.filter((r) => r.possible_minutes > 0);
    const best = ranked.reduce<typeof rows[number] | null>(
      (m, r) => (!m || r.capacity_pct > m.capacity_pct ? r : m),
      null,
    );
    const worst = ranked.reduce<typeof rows[number] | null>(
      (m, r) => (!m || r.capacity_pct < m.capacity_pct ? r : m),
      null,
    );
    return { booked, possible, revenue, capacity, best, worst };
  }, [rows]);

  const byLocation = useMemo(() => {
    const map = new Map<string, { booked: number; possible: number }>();
    for (const r of rows) {
      const e = map.get(r.location_name) ?? { booked: 0, possible: 0 };
      e.booked += r.booked_minutes;
      e.possible += r.possible_minutes;
      map.set(r.location_name, e);
    }
    return Array.from(map.entries())
      .map(([name, e]) => ({
        name,
        capacity: e.possible > 0 ? Math.round((1000 * e.booked) / e.possible) / 10 : 0,
      }))
      .sort((a, b) => b.capacity - a.capacity);
  }, [rows]);

  const trendData = networkTrend.map((p) => ({
    label: formatMonthLabel(p.month_start, true),
    capacity: p.capacity_pct,
  }));

  const kpis = [
    { title: "Courts online", value: rows.length, icon: MapPin,
      desc: `${locations.length} Standort${locations.length === 1 ? "" : "e"}` },
    { title: "Netzwerk-Auslastung", value: `${totals.capacity}%`, icon: Percent,
      desc: formatMonthLabel(month) },
    { title: "Gebuchte Stunden", value: formatHours(totals.booked), icon: Clock,
      desc: `von ${formatHours(totals.possible)} möglich` },
    { title: "Umsatz", value: formatEuros(totals.revenue), icon: Euro,
      desc: "Bestätigte Buchungen" },
    { title: "Top Court", value: totals.best ? `${totals.best.capacity_pct}%` : "–", icon: TrendingUp,
      desc: totals.best ? `${totals.best.court_name} · ${totals.best.location_name}` : "—" },
    { title: "Schwächster Court", value: totals.worst ? `${totals.worst.capacity_pct}%` : "–", icon: TrendingDown,
      desc: totals.worst ? `${totals.worst.court_name} · ${totals.worst.location_name}` : "—" },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header + month selector */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Auslastung</h1>
            <p className="text-muted-foreground">
              Kapazität aller Online-Courts im PADEL2GO-Netzwerk
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
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {kpis.map((card) => (
            <Card key={card.title} className="bg-card border-border">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {card.title}
                </CardTitle>
                <card.icon className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{card.value}</div>
                <p className="text-xs text-muted-foreground mt-1 truncate">{card.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <MapPin className="h-5 w-5 text-primary" />
                Auslastung pro Standort
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={byLocation}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(0, 0%, 15%)" />
                    <XAxis dataKey="name" stroke="hsl(0, 0%, 65%)" fontSize={12} />
                    <YAxis stroke="hsl(0, 0%, 65%)" fontSize={12} unit="%" />
                    <Tooltip
                      contentStyle={TOOLTIP_STYLE}
                      labelStyle={{ color: "hsl(0, 0%, 98%)" }}
                      formatter={(value: number) => [`${value}%`, "Auslastung"]}
                    />
                    <Bar dataKey="capacity" radius={[4, 4, 0, 0]}>
                      {byLocation.map((d) => (
                        <Cell key={d.name} fill={capacityHex(d.capacity)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <TrendingUp className="h-5 w-5 text-primary" />
                Netzwerk-Verlauf (6 Monate)
              </CardTitle>
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
                      formatter={(value: number) => [`${value}%`, "Auslastung"]}
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
        </div>

        {/* All-courts table */}
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Percent className="h-5 w-5 text-primary" />
              Alle Courts
            </CardTitle>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Select value={locationFilter} onValueChange={setLocationFilter}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Standort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Standorte</SelectItem>
                  {locations.map((l) => (
                    <SelectItem key={l} value={l}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Sortieren" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="capacity">Auslastung ↓</SelectItem>
                  <SelectItem value="booked">Gebuchte Stunden ↓</SelectItem>
                  <SelectItem value="revenue">Umsatz ↓</SelectItem>
                  <SelectItem value="name">Standort / Court</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground text-sm">Lädt…</p>
            ) : visibleRows.length === 0 ? (
              <p className="text-muted-foreground text-sm">Keine Online-Courts gefunden.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Standort</TableHead>
                    <TableHead>Court</TableHead>
                    <TableHead className="min-w-[160px]">Auslastung</TableHead>
                    <TableHead className="text-right">Gebucht</TableHead>
                    <TableHead className="text-right">Möglich</TableHead>
                    <TableHead className="text-right">Buchungen</TableHead>
                    <TableHead className="text-right">Umsatz</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleRows.map((r) => (
                    <TableRow key={r.court_id}>
                      <TableCell className="text-muted-foreground">
                        {r.location_name}
                        {r.location_city ? <span className="block text-xs">{r.location_city}</span> : null}
                      </TableCell>
                      <TableCell className="font-medium text-foreground">{r.court_name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-20 rounded-full bg-white/10 overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${Math.min(r.capacity_pct, 100)}%`,
                                backgroundColor: capacityHex(r.capacity_pct),
                              }}
                            />
                          </div>
                          <span className={`font-semibold ${capacityTextClass(r.capacity_pct)}`}>
                            {r.capacity_pct}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{minutesToHours(r.booked_minutes)} h</TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {minutesToHours(r.possible_minutes)} h
                      </TableCell>
                      <TableCell className="text-right">{r.bookings_count}</TableCell>
                      <TableCell className="text-right">{formatEuros(r.revenue_cents)}</TableCell>
                      <TableCell>
                        <Badge variant={r.is_active ? "default" : "secondary"}>
                          {r.is_active ? "Aktiv" : "Inaktiv"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
