/**
 * Pure calculation for the short-term treasury view: given manually entered
 * monthly cash snapshots, derive the KPIs Adrien wants (current value,
 * deltas vs -1/-3 months, monthly trend, chart series). No Prisma here —
 * shared by the API route, the /treasury page, and the agent's read path,
 * same principle as summary.ts aggregate().
 */

import { shiftMonth } from "@/lib/utils";

export interface CashSnapshotPoint {
  month: number;
  year: number;
  amount: number;
}

export interface TreasuryDelta {
  amount: number | null;
  pct: number | null;
}

export interface TreasuryStats<T extends CashSnapshotPoint> {
  current: T | null;
  previousMonth: T | null;
  threeMonthsAgo: T | null;
  vsPreviousMonth: TreasuryDelta;
  vsThreeMonthsAgo: TreasuryDelta;
  /** (current - threeMonthsAgo) / 3, null unless both points exist. */
  monthlyTrend: number | null;
  /** Last 6 snapshots that exist, chronological — gaps are simply absent. */
  chart: T[];
}

function findMonth<T extends CashSnapshotPoint>(sorted: T[], year: number, month: number): T | null {
  return sorted.find((s) => s.year === year && s.month === month) ?? null;
}

function delta<T extends CashSnapshotPoint>(current: T | null, base: T | null): TreasuryDelta {
  if (!current || !base) return { amount: null, pct: null };
  const amount = current.amount - base.amount;
  const pct = base.amount !== 0 ? (amount / base.amount) * 100 : null;
  return { amount, pct };
}

export function computeTreasuryStats<T extends CashSnapshotPoint>(snapshots: T[]): TreasuryStats<T> {
  const sorted = [...snapshots].sort((a, b) => a.year - b.year || a.month - b.month);
  const current = sorted.length ? sorted[sorted.length - 1] : null;

  let previousMonth: T | null = null;
  let threeMonthsAgo: T | null = null;
  if (current) {
    const m1 = shiftMonth(current.year, current.month, -1);
    previousMonth = findMonth(sorted, m1.year, m1.month);
    const m3 = shiftMonth(current.year, current.month, -3);
    threeMonthsAgo = findMonth(sorted, m3.year, m3.month);
  }

  return {
    current,
    previousMonth,
    threeMonthsAgo,
    vsPreviousMonth: delta(current, previousMonth),
    vsThreeMonthsAgo: delta(current, threeMonthsAgo),
    monthlyTrend:
      current && threeMonthsAgo ? (current.amount - threeMonthsAgo.amount) / 3 : null,
    chart: sorted.slice(-6),
  };
}
