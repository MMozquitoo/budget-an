/**
 * Orchestration for the analyse + recommandation rungs: pulls the data, runs the
 * pure engines (insights.ts, recommend.ts, budgets.ts), and returns one object.
 * Shared by /api/insights and the chat agent's analyze/recommend tools so they
 * can never disagree.
 */

import { prisma } from "@/lib/prisma";
import { buildReport } from "@/lib/budgets";
import { categoryMovements, savingsTrend, type MonthPoint } from "@/lib/insights";
import { recommend, totalOpportunity, type SubscriptionLite } from "@/lib/recommend";
import { detectRecurring } from "@/lib/recurring";
import {
  monthRange,
  monthKeyInZone,
  monthPartsInZone,
  shiftMonth,
  CATEGORY_LABELS,
} from "@/lib/utils";

export async function computeInsights(
  monthArg?: number | null,
  yearArg?: number | null,
  monthsArg = 6
) {
  const months = Math.min(Math.max(monthsArg, 2), 12);

  let month = monthArg ?? null;
  let year = yearArg ?? null;
  if (!month || !year) {
    const latest = await prisma.personalTransaction.findFirst({
      orderBy: { date: "desc" },
      select: { date: true },
    });
    const parts = monthPartsInZone(latest?.date ?? new Date());
    month = parts.month;
    year = parts.year;
  }

  const start = shiftMonth(year, month, -(months - 1));
  const seriesGte = monthRange(start.year, start.month).gte;
  const anchorLt = monthRange(year, month).lt;
  const subStart = shiftMonth(year, month, -17);

  const [seriesTx, anchorBudgets, subsTx] = await Promise.all([
    prisma.personalTransaction.findMany({
      where: { parentId: null, date: { gte: seriesGte, lt: anchorLt } },
      select: { amount: true, group: true, category: true, date: true },
    }),
    prisma.budget.findMany({ where: { month, year } }),
    prisma.personalTransaction.findMany({
      where: {
        parentId: null,
        group: { notIn: ["INCOME", "TRANSFER"] },
        date: { gte: monthRange(subStart.year, subStart.month).gte, lt: anchorLt },
      },
      select: { id: true, date: true, amount: true, group: true, category: true, description: true },
      orderBy: { date: "asc" },
    }),
  ]);

  // Month series (one bucket per month, missing months stay at zero).
  const buckets = new Map<string, MonthPoint>();
  for (let i = months - 1; i >= 0; i--) {
    const { year: y, month: m } = shiftMonth(year, month, -i);
    const key = `${y}-${String(m).padStart(2, "0")}`;
    buckets.set(key, { key, income: 0, savings: 0, expenses: 0, byCategory: {} });
  }
  for (const t of seriesTx) {
    const b = buckets.get(monthKeyInZone(t.date));
    if (!b) continue;
    const amt = Number(t.amount);
    b.byCategory[t.category] = (b.byCategory[t.category] ?? 0) + amt;
    if (t.group === "INCOME") b.income += amt;
    else if (t.group === "SAVINGS") b.savings += amt;
    else if (t.group !== "TRANSFER") b.expenses += amt;
  }
  const series = [...buckets.values()];
  const anchorPoint = series[series.length - 1];

  const budgetReport = anchorBudgets.length
    ? buildReport(
        anchorBudgets.map((b) => ({ category: b.category as string, amount: Number(b.amount) })),
        anchorPoint?.byCategory ?? {}
      )
    : null;

  const subscriptions: SubscriptionLite[] = detectRecurring(
    subsTx.map((t) => ({ ...t, amount: Number(t.amount) }))
  ).map((s) => ({
    description: s.description,
    active: s.active,
    monthlyEquivalent: s.monthlyEquivalent,
    lastDate: s.lastDate,
    priceChange: s.priceChange,
  }));

  const movements = categoryMovements(series);
  const savings = savingsTrend(series);
  const recommendations = recommend({
    budgetReport,
    movements,
    subscriptions,
    savings,
    labels: CATEGORY_LABELS,
  });

  return {
    month,
    year,
    months,
    savings,
    movements: movements.map((m) => ({ ...m, label: CATEGORY_LABELS[m.category] ?? m.category })),
    budget: budgetReport
      ? {
          totalBudget: budgetReport.totalBudget,
          totalActual: budgetReport.totalActual,
          overCount: budgetReport.overCount,
          unbudgetedSpend: budgetReport.unbudgetedSpend,
        }
      : null,
    recommendations,
    totalOpportunity: totalOpportunity(recommendations),
  };
}
