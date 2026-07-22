import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";
import { safe } from "@/lib/api";
import { aggregate } from "@/lib/summary";
import {
  monthRange,
  shiftMonth,
  getCurrentMonth,
  getCurrentYear,
} from "@/lib/utils";

export const GET = safe(async (request: NextRequest) => {
  const sp = request.nextUrl.searchParams;
  const month = Number(sp.get("month") || getCurrentMonth());
  const year = Number(sp.get("year") || getCurrentYear());

  if (!Number.isInteger(month) || month < 1 || month > 12) {
    return Response.json({ error: "Mois invalide" }, { status: 400 });
  }
  if (!Number.isInteger(year) || year < 1970 || year > 3000) {
    return Response.json({ error: "Année invalide" }, { status: 400 });
  }

  const prev = shiftMonth(year, month, -1);

  // parentId: null excludes split children. A split keeps its parent row and
  // adds children summing to it, so counting both double-counts that
  // transaction — which is what this route did while trends and the chat agent
  // did not, giving three different totals for the same month.
  const [current, previous] = await Promise.all([
    prisma.personalTransaction.findMany({
      where: { date: monthRange(year, month), parentId: null },
      select: { amount: true, group: true, category: true },
    }),
    prisma.personalTransaction.findMany({
      where: { date: monthRange(prev.year, prev.month), parentId: null },
      select: { amount: true, group: true, category: true },
    }),
  ]);

  const toLite = (rows: typeof current) =>
    rows.map((t) => ({
      amount: Number(t.amount),
      group: t.group as string,
      category: t.category as string,
    }));

  const totals = aggregate(toLite(current));
  const prevTotals = aggregate(toLite(previous));

  return Response.json({
    month,
    year,
    ...totals,
    prevIncome: prevTotals.totalIncome,
    prevExpenses: prevTotals.totalExpenses,
  });
});
