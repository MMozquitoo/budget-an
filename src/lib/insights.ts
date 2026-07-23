/**
 * Analyse engine — the "analyse" rung of the ladder (reporting → analyse →
 * recommandation → alerting). Pure, database-free, unit-testable. It turns a
 * month-by-month series into *what changed*: which categories moved most versus
 * their own trailing average, and where the savings rate is heading.
 */

import { CATEGORY_GROUP } from "./budgets";

export interface MonthPoint {
  key: string; // "YYYY-MM"
  income: number;
  savings: number;
  expenses: number;
  byCategory: Record<string, number>;
}

export interface CategoryMovement {
  category: string;
  group: string;
  current: number; // latest month
  average: number; // mean of the prior months (excludes the latest)
  delta: number; // current - average
  deltaPct: number; // delta relative to the average
  direction: "up" | "down";
}

/**
 * Categories whose latest month deviates most from their own trailing average.
 * Income is excluded (this is about spending/saving behaviour). `minDelta` drops
 * noise: a €3 wobble is not a movement. Returns biggest absolute movers first.
 */
export function categoryMovements(
  series: MonthPoint[],
  minDelta = 25
): CategoryMovement[] {
  if (series.length < 2) return [];
  const prior = series.slice(0, -1);
  const current = series[series.length - 1];

  const categories = new Set<string>();
  for (const p of series) for (const c of Object.keys(p.byCategory)) categories.add(c);

  const out: CategoryMovement[] = [];
  for (const category of categories) {
    const group = CATEGORY_GROUP[category];
    if (!group || group === "INCOME") continue;

    const cur = current.byCategory[category] ?? 0;
    const avg = prior.reduce((s, p) => s + (p.byCategory[category] ?? 0), 0) / prior.length;
    const delta = cur - avg;
    if (Math.abs(delta) < minDelta) continue;

    out.push({
      category,
      group,
      current: cur,
      average: avg,
      delta,
      deltaPct: avg > 0 ? (delta / avg) * 100 : cur > 0 ? 100 : 0,
      direction: delta >= 0 ? "up" : "down",
    });
  }

  out.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  return out;
}

export interface SavingsTrend {
  current: number; // latest month savings rate, %
  previous: number; // month before, %
  average: number; // mean of prior months, %
  deltaPts: number; // current - previous, in percentage points
  direction: "up" | "down" | "flat";
}

const rate = (p: MonthPoint) => (p.income > 0 ? (p.savings / p.income) * 100 : 0);

/** Savings-rate trend: latest vs previous vs trailing average. */
export function savingsTrend(series: MonthPoint[]): SavingsTrend | null {
  if (series.length < 2) return null;
  const current = rate(series[series.length - 1]);
  const previous = rate(series[series.length - 2]);
  const prior = series.slice(0, -1);
  const average = prior.reduce((s, p) => s + rate(p), 0) / prior.length;
  const deltaPts = current - previous;
  const direction = deltaPts > 1 ? "up" : deltaPts < -1 ? "down" : "flat";
  return { current, previous, average, deltaPts, direction };
}
