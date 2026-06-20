import { format } from "date-fns";
import { de } from "date-fns/locale";

/** First day of the month for a given date, as an ISO date string (YYYY-MM-DD). */
export function monthStartISO(date: Date): string {
  return format(new Date(date.getFullYear(), date.getMonth(), 1), "yyyy-MM-dd");
}

/** Short month label, e.g. "Juni 2026" / "Jun 2026". */
export function formatMonthLabel(value: string | Date, short = false): string {
  const d = typeof value === "string" ? new Date(value) : value;
  return format(d, short ? "MMM yy" : "MMMM yyyy", { locale: de });
}

/** Convert minutes to hours rounded to one decimal. */
export function minutesToHours(minutes: number): number {
  return Math.round((minutes / 60) * 10) / 10;
}

/** Human-readable hours, German formatting, e.g. "42,5 h". */
export function formatHours(minutes: number): string {
  return `${minutesToHours(minutes).toLocaleString("de-DE")} h`;
}

/**
 * Capacity color thresholds (utilization % of open hours):
 *   < 40  → red (under-used)
 *   40–75 → amber
 *   > 75  → green (well-used)
 */
export function capacityHex(pct: number): string {
  if (pct < 40) return "#ef4444";
  if (pct <= 75) return "#f59e0b";
  return "#22c55e";
}

export function capacityTextClass(pct: number): string {
  if (pct < 40) return "text-red-500";
  if (pct <= 75) return "text-amber-500";
  return "text-green-500";
}
