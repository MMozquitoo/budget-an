/**
 * Recurring-charge detection.
 *
 * The `recurring` boolean on PersonalTransaction is only ever set by hand in the
 * Opérations form — no import writes it — so anything relying on it alone (the
 * Abonnements page, the agent's getSubscriptions tool) showed almost nothing.
 * This derives subscriptions from the transaction history instead: same payee
 * appearing on a regular cadence. The stored flag is still honoured, so a
 * manually flagged charge shows up even with too little history to detect.
 *
 * Pure and deterministic — `referenceDate` is injected, never read from the
 * clock — so it can be unit-tested and reused by both the API and the agent.
 */

import { monthPartsInZone } from "@/lib/utils";

export interface RecurringInput {
  id: string;
  date: Date | string;
  amount: number;
  group: string;
  category: string;
  description: string;
  recurring?: boolean;
}

export type Cadence = "MONTHLY" | "QUARTERLY" | "YEARLY" | "IRREGULAR";

export interface RecurringSeries {
  key: string;
  description: string;
  group: string;
  category: string;
  /** Most recent charge amount. */
  amount: number;
  /** Amount normalised to a month, so different cadences can be summed. */
  monthlyEquivalent: number;
  cadence: Cadence;
  cadenceMonths: number;
  occurrences: number;
  firstDate: string;
  lastDate: string;
  /** False once a charge stops arriving — a cancelled or dead subscription. */
  active: boolean;
  /** True when the amount moves around (utilities), false for flat fees. */
  variableAmount: boolean;
  priceChange: { from: number; to: number; pct: number } | null;
  source: "detected" | "manual";
  transactionIds: string[];
}

export interface DetectOptions {
  referenceDate?: Date;
  timeZone?: string;
  /** Occurrences needed before a monthly series is trusted. */
  minOccurrences?: number;
}

/**
 * Collapse a bank label to a stable payee key: "CARTE 12/03/25 NETFLIX.COM
 * 1234" and "CARTE 04/04/25 NETFLIX.COM 5678" must land on the same series.
 */
export function normalizeLabel(description: string): string {
  return description
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip accents
    .replace(/\d{1,2}[/.-]\d{1,2}([/.-]\d{2,4})?/g, " ") // dates
    .replace(/\b(carte|cb|vir|virement|prlv|prelevement|paiement|achat)\b/g, " ")
    .replace(/\brum\s+\S+/g, " ") // SEPA mandate refs
    .replace(/\b[a-z]*\d[a-z\d]*\b/g, " ") // any token containing a digit
    .replace(/[^a-z ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

/** Absolute month index, so gaps can be measured by subtraction. */
function monthIndex(date: Date, timeZone: string): number {
  const { year, month } = monthPartsInZone(date, timeZone);
  return year * 12 + (month - 1);
}

function classifyCadence(gaps: number[]): { cadence: Cadence; months: number } {
  if (gaps.length === 0) return { cadence: "MONTHLY", months: 1 };
  const g = median(gaps);
  if (g <= 1.5) return { cadence: "MONTHLY", months: 1 };
  if (g >= 2 && g <= 4.5) return { cadence: "QUARTERLY", months: Math.round(g) };
  if (g >= 10 && g <= 14) return { cadence: "YEARLY", months: 12 };
  return { cadence: "IRREGULAR", months: Math.max(1, Math.round(g)) };
}

export function detectRecurring(
  transactions: RecurringInput[],
  options: DetectOptions = {}
): RecurringSeries[] {
  const timeZone = options.timeZone ?? "Europe/Paris";
  const minOccurrences = options.minOccurrences ?? 3;

  const parsed = transactions
    .map((t) => ({ ...t, dateObj: new Date(t.date) }))
    .filter((t) => !Number.isNaN(t.dateObj.getTime()))
    .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());

  if (parsed.length === 0) return [];

  const referenceDate =
    options.referenceDate ?? parsed[parsed.length - 1].dateObj;
  const refIndex = monthIndex(referenceDate, timeZone);

  const groups = new Map<string, typeof parsed>();
  for (const t of parsed) {
    const key = normalizeLabel(t.description);
    if (!key) continue;
    const bucket = groups.get(key);
    if (bucket) bucket.push(t);
    else groups.set(key, [t]);
  }

  const series: RecurringSeries[] = [];

  for (const [key, items] of groups) {
    // Two charges in the same month (a top-up, a correction) are one occurrence
    // for cadence purposes — otherwise the gap maths reads them as irregular.
    const byMonth = new Map<number, typeof items>();
    for (const t of items) {
      const idx = monthIndex(t.dateObj, timeZone);
      const bucket = byMonth.get(idx);
      if (bucket) bucket.push(t);
      else byMonth.set(idx, [t]);
    }

    const monthIndexes = [...byMonth.keys()].sort((a, b) => a - b);
    const gaps: number[] = [];
    for (let i = 1; i < monthIndexes.length; i++) {
      gaps.push(monthIndexes[i] - monthIndexes[i - 1]);
    }

    const { cadence, months: cadenceMonths } = classifyCadence(gaps);
    const manuallyFlagged = items.some((t) => t.recurring === true);

    // A yearly charge can only ever show two occurrences in two years of data,
    // so it gets a lower bar than a monthly one.
    const required = cadence === "YEARLY" ? 2 : minOccurrences;
    const detected = monthIndexes.length >= required && cadence !== "IRREGULAR";

    if (!detected && !manuallyFlagged) continue;

    // Per-month totals: a subscription billed twice in one month still costs
    // the sum of both charges that month.
    const monthlyAmounts = monthIndexes.map((idx) =>
      byMonth.get(idx)!.reduce((sum, t) => sum + Number(t.amount), 0)
    );
    const baseline = median(monthlyAmounts);
    const latestAmount = monthlyAmounts[monthlyAmounts.length - 1];

    const variableAmount = monthlyAmounts.some(
      (a) => baseline > 0 && Math.abs(a - baseline) / baseline > 0.15
    );

    let priceChange: RecurringSeries["priceChange"] = null;
    if (monthlyAmounts.length >= 3) {
      const previous = median(monthlyAmounts.slice(0, -1));
      const delta = latestAmount - previous;
      if (previous > 0 && Math.abs(delta) > Math.max(1, previous * 0.05)) {
        priceChange = {
          from: previous,
          to: latestAmount,
          pct: (delta / previous) * 100,
        };
      }
    }

    const last = items[items.length - 1];
    const first = items[0];
    const monthsSinceLast = refIndex - monthIndexes[monthIndexes.length - 1];

    series.push({
      key,
      description: last.description,
      group: last.group,
      category: last.category,
      amount: latestAmount,
      monthlyEquivalent: latestAmount / cadenceMonths,
      cadence,
      cadenceMonths,
      occurrences: monthIndexes.length,
      firstDate: first.dateObj.toISOString().slice(0, 10),
      lastDate: last.dateObj.toISOString().slice(0, 10),
      active: monthsSinceLast <= cadenceMonths + 1,
      variableAmount,
      priceChange,
      source: detected ? "detected" : "manual",
      transactionIds: items.map((t) => t.id),
    });
  }

  return series.sort((a, b) => b.monthlyEquivalent - a.monthlyEquivalent);
}

/** Totals for the active series only — dead subscriptions shouldn't inflate them. */
export function summariseRecurring(series: RecurringSeries[]) {
  const active = series.filter((s) => s.active);
  const monthlyTotal = active.reduce((sum, s) => sum + s.monthlyEquivalent, 0);
  return {
    count: active.length,
    inactiveCount: series.length - active.length,
    monthlyTotal,
    yearlyTotal: monthlyTotal * 12,
    priceIncreases: active.filter((s) => s.priceChange && s.priceChange.pct > 0)
      .length,
  };
}
