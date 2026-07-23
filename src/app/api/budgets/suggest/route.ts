import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";
import { safe, toFiniteNumber } from "@/lib/api";
import { suggestFromTransactions } from "@/lib/budgets";
import { monthRangeBack, monthPartsInZone } from "@/lib/utils";

// GET /api/budgets/suggest?months=6&month=&year=
// Suggests a budget per category from the N months BEFORE the anchor month.
// Adrien asked for a 6–9 month window; default 6. Anchor defaults to the latest
// transaction month (falling back to the current month).
export const GET = safe(async (request: NextRequest) => {
  const sp = request.nextUrl.searchParams;
  const months = Math.min(Math.max(toFiniteNumber(sp.get("months")) ?? 6, 1), 24);

  let anchorMonth = toFiniteNumber(sp.get("month"));
  let anchorYear = toFiniteNumber(sp.get("year"));
  if (!anchorMonth || !anchorYear) {
    const latest = await prisma.personalTransaction.findFirst({
      orderBy: { date: "desc" },
      select: { date: true },
    });
    const parts = monthPartsInZone(latest?.date ?? new Date());
    anchorMonth = parts.month;
    anchorYear = parts.year;
  }

  const { gte, lt } = monthRangeBack(anchorYear, anchorMonth, months);
  const txs = await prisma.personalTransaction.findMany({
    where: { parentId: null, date: { gte, lt } },
    select: { amount: true, category: true, date: true },
  });

  const suggestions = suggestFromTransactions(
    txs.map((t) => ({ amount: Number(t.amount), category: t.category, date: t.date })),
    anchorYear,
    anchorMonth,
    months
  );
  return Response.json({ anchorMonth, anchorYear, months, suggestions });
});
