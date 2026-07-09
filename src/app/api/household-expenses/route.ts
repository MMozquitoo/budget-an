import { prisma } from "@/lib/prisma";
import { monthRange } from "@/lib/utils";
import { safe, toFiniteNumber, toValidDate, badRequest } from "@/lib/api";
import { NextRequest } from "next/server";

export const GET = safe(async (request: NextRequest) => {
  const searchParams = request.nextUrl.searchParams;
  const month = searchParams.get("month");
  const year = searchParams.get("year");

  const where: Record<string, unknown> = {};

  if (month && year) {
    where.date = monthRange(Number(year), Number(month));
  }

  const expenses = await prisma.householdExpense.findMany({
    where,
    orderBy: { date: "desc" },
  });

  return Response.json(
    expenses.map((e) => ({ ...e, amount: Number(e.amount) }))
  );
});

export const POST = safe(async (request: NextRequest) => {
  const body = await request.json();

  const amount = toFiniteNumber(body.amount);
  if (amount === undefined) return badRequest("Invalid amount");
  const date = toValidDate(body.date);
  if (date === undefined) return badRequest("Invalid date");

  const expense = await prisma.householdExpense.create({
    data: {
      date,
      amount,
      category: body.category,
      description: body.description,
    },
  });

  return Response.json({ ...expense, amount: Number(expense.amount) }, { status: 201 });
});

export const DELETE = safe(async (request: NextRequest) => {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return badRequest("id required");

  await prisma.householdExpense.delete({ where: { id } });
  return Response.json({ ok: true });
});
