import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";
import { safe } from "@/lib/api";
import { detectRecurring, summariseRecurring } from "@/lib/recurring";
import { monthPartsInZone, monthRange, shiftMonth } from "@/lib/utils";

/**
 * Subscriptions and recurring charges, derived from the transaction history
 * rather than the hand-set `recurring` flag (which no import ever writes).
 *
 * ?months=N  history window to analyse (default 18, max 60)
 * ?all=true  include series that have stopped arriving (cancelled subscriptions)
 */
export const GET = safe(async (request: NextRequest) => {
  const sp = request.nextUrl.searchParams;
  const requested = Number(sp.get("months") || 18);
  const months = Number.isInteger(requested)
    ? Math.min(Math.max(requested, 3), 60)
    : 18;

  const latest = await prisma.personalTransaction.findFirst({
    orderBy: { date: "desc" },
    select: { date: true },
  });

  if (!latest) {
    return Response.json({
      series: [],
      summary: { count: 0, inactiveCount: 0, monthlyTotal: 0, yearlyTotal: 0, priceIncreases: 0 },
    });
  }

  const end = monthPartsInZone(latest.date);
  const start = shiftMonth(end.year, end.month, -(months - 1));

  const transactions = await prisma.personalTransaction.findMany({
    where: {
      date: {
        gte: monthRange(start.year, start.month).gte,
        lt: monthRange(end.year, end.month).lt,
      },
      parentId: null,
      // Income is regular too (salary), but it is not a subscription.
      group: { not: "INCOME" },
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

  const includeInactive = sp.get("all") === "true";
  const series = includeInactive ? all : all.filter((s) => s.active);

  return Response.json({ series, summary: summariseRecurring(all) });
});
