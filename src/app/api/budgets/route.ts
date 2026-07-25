import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";
import { safe, badRequest, isEnumValue, toFiniteNumber } from "@/lib/api";
import { TransactionCategory } from "@/generated/prisma/client";
import { getBudgetReport } from "@/lib/dashboard-data";

// GET /api/budgets?month=&year= → the month's budgets merged with actual spend.
export const GET = safe(async (request: NextRequest) => {
  const sp = request.nextUrl.searchParams;
  const month = toFiniteNumber(sp.get("month"));
  const year = toFiniteNumber(sp.get("year"));
  if (!month || !year) return badRequest("month and year required");

  return Response.json(await getBudgetReport(month, year));
});

// POST /api/budgets — upsert one budget or a batch (from the suggestions).
// Body: { month, year, category, amount } OR { month, year, budgets: [{category, amount}] }
export const POST = safe(async (request: NextRequest) => {
  const body = await request.json();
  const month = toFiniteNumber(body.month);
  const year = toFiniteNumber(body.year);
  if (!month || !year) return badRequest("month and year required");

  const raw: Array<{ category: unknown; amount: unknown }> = Array.isArray(body.budgets)
    ? body.budgets
    : [{ category: body.category, amount: body.amount }];

  const cleaned: Array<{ category: TransactionCategory; amount: number }> = [];
  for (const it of raw) {
    if (!isEnumValue(it.category, TransactionCategory)) {
      return badRequest(`Invalid category: ${String(it.category)}`);
    }
    const amount = toFiniteNumber(it.amount);
    if (amount === undefined || amount < 0) {
      return badRequest("amount must be a positive number");
    }
    cleaned.push({ category: it.category as TransactionCategory, amount });
  }

  const saved = await prisma.$transaction(
    cleaned.map((it) =>
      prisma.budget.upsert({
        where: { month_year_category: { month, year, category: it.category } },
        update: { amount: it.amount },
        create: { month, year, category: it.category, amount: it.amount },
      })
    )
  );

  return Response.json(
    saved.map((b) => ({
      id: b.id,
      month: b.month,
      year: b.year,
      category: b.category,
      amount: Number(b.amount),
    })),
    { status: 201 }
  );
});

// DELETE /api/budgets?id=  OR  ?month=&year=&category=
export const DELETE = safe(async (request: NextRequest) => {
  const sp = request.nextUrl.searchParams;
  const id = sp.get("id");
  if (id) {
    await prisma.budget.delete({ where: { id } });
    return Response.json({ ok: true });
  }

  const month = toFiniteNumber(sp.get("month"));
  const year = toFiniteNumber(sp.get("year"));
  const category = sp.get("category");
  if (!month || !year || !category) {
    return badRequest("id, or month + year + category, required");
  }
  if (!isEnumValue(category, TransactionCategory)) {
    return badRequest("Invalid category");
  }

  await prisma.budget.delete({
    where: {
      month_year_category: { month, year, category: category as TransactionCategory },
    },
  });
  return Response.json({ ok: true });
});
