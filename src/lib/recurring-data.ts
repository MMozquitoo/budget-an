/**
 * Orchestration for subscriptions/recurring charges: pulls transaction history
 * and runs the pure detection engine. Shared by /api/transactions/recurring
 * and the /subscriptions Server Component.
 */

import { prisma } from "@/lib/prisma";
import { detectRecurring, summariseRecurring } from "@/lib/recurring";
import { monthPartsInZone, monthRange, shiftMonth } from "@/lib/utils";

export async function getRecurringData(months = 18, includeInactive = false) {
  const window = Number.isInteger(months) ? Math.min(Math.max(months, 3), 60) : 18;

  const latest = await prisma.personalTransaction.findFirst({
    orderBy: { date: "desc" },
    select: { date: true },
  });

  if (!latest) {
    return {
      series: [],
      summary: { count: 0, inactiveCount: 0, monthlyTotal: 0, yearlyTotal: 0, priceIncreases: 0 },
    };
  }

  const end = monthPartsInZone(latest.date);
  const start = shiftMonth(end.year, end.month, -(window - 1));

  const transactions = await prisma.personalTransaction.findMany({
    where: {
      date: {
        gte: monthRange(start.year, start.month).gte,
        lt: monthRange(end.year, end.month).lt,
      },
      parentId: null,
      // Income is regular too (salary), but it is not a subscription — and
      // neither is a recurring internal transfer or a business cash flow.
      group: { notIn: ["INCOME", "TRANSFER", "BUSINESS"] },
    },
    select: {
      id: true,
      date: true,
      amount: true,
      group: true,
      category: true,
      description: true,
      recurring: true,
    },
    orderBy: { date: "asc" },
  });

  const all = detectRecurring(
    transactions.map((t) => ({ ...t, amount: Number(t.amount) })),
    { referenceDate: latest.date }
  );

  const series = includeInactive ? all : all.filter((s) => s.active);

  return { series, summary: summariseRecurring(all) };
}
