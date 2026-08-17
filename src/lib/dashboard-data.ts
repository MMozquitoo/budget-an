/**
 * Orchestration for the dashboard's five independent data pieces: latest
 * month, month summary, trends, budget report, account breakdown. Each was
 * previously inline in its own API route; extracted here so the dashboard
 * Server Component and the routes share the exact same logic (same rule as
 * forecast-data.ts/insights-data.ts/recurring-data.ts) instead of the page
 * going through an HTTP round-trip per card.
 */

import { prisma } from "@/lib/prisma";
import { aggregate } from "@/lib/summary";
import { buildReport } from "@/lib/budgets";
import { accountBreakdown } from "@/lib/accounts";
import { getTaxonomy } from "@/lib/taxonomy";
import {
  monthRange,
  monthPartsInZone,
  monthKeyInZone,
  shiftMonth,
  getCurrentMonth,
  getCurrentYear,
} from "@/lib/utils";

/** The month the app should open on: the month of the most recent transaction. */
export async function getLatestMonth() {
  const latest = await prisma.personalTransaction.findFirst({
    orderBy: { date: "desc" },
    select: { date: true },
  });

  if (!latest) {
    return { month: getCurrentMonth(), year: getCurrentYear() };
  }
  return monthPartsInZone(latest.date);
}

/** Current + previous month totals, via the single aggregate() everyone shares. */
export async function getMonthSummary(month: number, year: number) {
  const prev = shiftMonth(year, month, -1);

  const [current, previous, taxonomy] = await Promise.all([
    prisma.personalTransaction.findMany({
      where: { date: monthRange(year, month), parentId: null },
      select: { amount: true, group: true, category: true },
    }),
    prisma.personalTransaction.findMany({
      where: { date: monthRange(prev.year, prev.month), parentId: null },
      select: { amount: true, group: true, category: true },
    }),
    getTaxonomy(),
  ]);

  const toLite = (rows: typeof current) =>
    rows.map((t) => ({
      amount: Number(t.amount),
      group: t.group as string,
      category: t.category as string,
    }));

  const totals = aggregate(toLite(current), taxonomy.groupBehavior);
  const prevTotals = aggregate(toLite(previous), taxonomy.groupBehavior);

  return {
    month,
    year,
    ...totals,
    prevIncome: prevTotals.totalIncome,
    prevExpenses: prevTotals.totalExpenses,
  };
}

interface TrendBucket {
  year: number;
  month: number;
  byGroup: Record<string, number>;
  byCategory: Record<string, number>;
}

/** N months of byGroup/byCategory totals, anchored on the latest transaction's month. */
export async function getMonthlyTrends(monthsArg = 6, groupFilter?: string) {
  const numMonths = Number.isInteger(monthsArg) ? Math.min(Math.max(monthsArg, 1), 60) : 6;

  const latest = await prisma.personalTransaction.findFirst({
    orderBy: { date: "desc" },
    select: { date: true },
  });
  if (!latest) return [];

  const end = monthPartsInZone(latest.date);
  const start = shiftMonth(end.year, end.month, -(numMonths - 1));

  const where: Record<string, unknown> = {
    date: { gte: monthRange(start.year, start.month).gte, lt: monthRange(end.year, end.month).lt },
    parentId: null,
  };
  if (groupFilter) where.group = groupFilter;

  const transactions = await prisma.personalTransaction.findMany({
    where,
    orderBy: { date: "asc" },
    select: { date: true, amount: true, group: true, category: true },
  });

  const buckets = new Map<string, TrendBucket>();
  for (let i = 0; i < numMonths; i++) {
    const { year, month } = shiftMonth(start.year, start.month, i);
    buckets.set(`${year}-${String(month).padStart(2, "0")}`, { year, month, byGroup: {}, byCategory: {} });
  }

  for (const t of transactions) {
    const key = monthKeyInZone(t.date);
    let bucket = buckets.get(key);
    if (!bucket) {
      const [y, m] = key.split("-");
      bucket = { year: Number(y), month: Number(m), byGroup: {}, byCategory: {} };
      buckets.set(key, bucket);
    }
    const amt = Number(t.amount);
    bucket.byGroup[t.group] = (bucket.byGroup[t.group] || 0) + amt;
    bucket.byCategory[t.category] = (bucket.byCategory[t.category] || 0) + amt;
  }

  return Array.from(buckets.values()).sort((a, b) => a.year - b.year || a.month - b.month);
}

/** The month's budgets merged with actual spend. */
export async function getBudgetReport(month: number, year: number) {
  const [budgets, transactions, taxonomy] = await Promise.all([
    prisma.budget.findMany({ where: { month, year }, orderBy: { category: "asc" } }),
    prisma.personalTransaction.findMany({
      where: { parentId: null, date: monthRange(year, month) },
      select: { amount: true, group: true, category: true },
    }),
    getTaxonomy(),
  ]);

  const { byCategory } = aggregate(
    transactions.map((t) => ({ amount: Number(t.amount), group: t.group, category: t.category })),
    taxonomy.groupBehavior
  );

  const report = buildReport(
    budgets.map((b) => ({ category: b.category, amount: Number(b.amount) })),
    byCategory,
    taxonomy.categoryGroup,
    taxonomy.groupBehavior
  );

  return { month, year, ...report };
}

/** Spend/income per source account for the month. */
export async function getAccountBreakdown(month: number, year: number) {
  const [txs, taxonomy] = await Promise.all([
    prisma.personalTransaction.findMany({
      where: { parentId: null, date: monthRange(year, month) },
      select: { notes: true, group: true, category: true, amount: true },
    }),
    getTaxonomy(),
  ]);

  const accounts = accountBreakdown(
    txs.map((t) => ({ notes: t.notes, group: t.group, category: t.category, amount: Number(t.amount) })),
    taxonomy.groupBehavior
  );
  return { month, year, accounts };
}
