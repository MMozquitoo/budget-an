import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";
import { safe, badRequest, toFiniteNumber } from "@/lib/api";

// POST /api/budgets/copy — carry budgets from one month to another
// ("report d'un mois sur l'autre"). Body: { fromMonth, fromYear, toMonth, toYear }.
// Upserts, so re-running is idempotent and won't duplicate a category.
export const POST = safe(async (request: NextRequest) => {
  const body = await request.json();
  const fromMonth = toFiniteNumber(body.fromMonth);
  const fromYear = toFiniteNumber(body.fromYear);
  const toMonth = toFiniteNumber(body.toMonth);
  const toYear = toFiniteNumber(body.toYear);
  if (!fromMonth || !fromYear || !toMonth || !toYear) {
    return badRequest("fromMonth, fromYear, toMonth, toYear required");
  }
  if (fromMonth === toMonth && fromYear === toYear) {
    return badRequest("source and target month must differ");
  }

  const source = await prisma.budget.findMany({
    where: { month: fromMonth, year: fromYear },
  });
  if (source.length === 0) {
    return Response.json({ copied: 0, budgets: [] });
  }

  const saved = await prisma.$transaction(
    source.map((b) =>
      prisma.budget.upsert({
        where: {
          month_year_category: { month: toMonth, year: toYear, category: b.category },
        },
        update: { amount: b.amount },
        create: { month: toMonth, year: toYear, category: b.category, amount: b.amount },
      })
    )
  );

  return Response.json({
    copied: saved.length,
    budgets: saved.map((b) => ({
      id: b.id,
      month: b.month,
      year: b.year,
      category: b.category,
      amount: Number(b.amount),
    })),
  });
});
