/**
 * Orchestration for the cash-flow forecast: pulls recent flow, derives a starting
 * balance (latest net-worth cash, or an override), and runs the pure forecast
 * engine. Shared by /api/forecast and the chat agent's forecast tool.
 */

import { prisma } from "@/lib/prisma";
import { averageNetFlow, forecast, firstShortfall, type FlowMonth } from "@/lib/forecast";
import { monthRange, monthKeyInZone, monthPartsInZone, shiftMonth } from "@/lib/utils";

export async function computeForecast(
  monthsArg = 6,
  horizonArg = 6,
  overrideStart?: number
) {
  const months = Math.min(Math.max(monthsArg, 2), 12);
  const horizon = Math.min(Math.max(horizonArg, 1), 12);

  const latest = await prisma.personalTransaction.findFirst({
    orderBy: { date: "desc" },
    select: { date: true },
  });
  const anchor = monthPartsInZone(latest?.date ?? new Date());

  const start = shiftMonth(anchor.year, anchor.month, -(months - 1));
  const txs = await prisma.personalTransaction.findMany({
    where: {
      parentId: null,
      date: {
        gte: monthRange(start.year, start.month).gte,
        lt: monthRange(anchor.year, anchor.month).lt,
      },
    },
    select: { amount: true, group: true, date: true },
  });

  const buckets = new Map<string, FlowMonth>();
  for (let i = months - 1; i >= 0; i--) {
    const { year, month } = shiftMonth(anchor.year, anchor.month, -i);
    buckets.set(`${year}-${String(month).padStart(2, "0")}`, { income: 0, expenses: 0, savings: 0 });
  }
  for (const t of txs) {
    const b = buckets.get(monthKeyInZone(t.date));
    if (!b) continue;
    const amt = Number(t.amount);
    if (t.group === "INCOME") b.income += amt;
    else if (t.group === "SAVINGS") b.savings += amt;
    else b.expenses += amt;
  }
  const series = [...buckets.values()];
  const avgNetFlow = averageNetFlow(series);

  let startingBalance = overrideStart;
  let startingSource: "override" | "net-worth" | "none" = "override";
  if (startingBalance === undefined) {
    const snap = await prisma.netWorthSnapshot.findFirst({
      orderBy: [{ year: "desc" }, { month: "desc" }],
      select: { cash: true },
    });
    if (snap) {
      startingBalance = Number(snap.cash);
      startingSource = "net-worth";
    } else {
      startingBalance = 0;
      startingSource = "none";
    }
  }

  const points = forecast(startingBalance, avgNetFlow, horizon, anchor.year, anchor.month);

  return {
    anchor,
    months,
    horizon,
    startingBalance,
    startingSource,
    avgNetFlow,
    points,
    shortfall: firstShortfall(points),
  };
}
