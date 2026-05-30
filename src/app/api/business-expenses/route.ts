import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const month = searchParams.get("month");
  const year = searchParams.get("year");
  const businessLineId = searchParams.get("businessLineId");

  const where: Record<string, unknown> = {};

  if (month && year) {
    const startDate = new Date(Number(year), Number(month) - 1, 1);
    const endDate = new Date(Number(year), Number(month), 0, 23, 59, 59);
    where.date = { gte: startDate, lte: endDate };
  }

  if (businessLineId) where.businessLineId = businessLineId;

  const expenses = await prisma.businessExpense.findMany({
    where,
    include: { businessLine: true },
    orderBy: { date: "desc" },
  });

  return Response.json(
    expenses.map((e) => ({ ...e, amount: Number(e.amount) }))
  );
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  const expense = await prisma.businessExpense.create({
    data: {
      date: new Date(body.date),
      amount: body.amount,
      description: body.description,
      category: body.category,
      isOwnerDraw: body.isOwnerDraw ?? false,
      businessLineId: body.businessLineId,
    },
    include: { businessLine: true },
  });

  return Response.json(
    { ...expense, amount: Number(expense.amount) },
    { status: 201 }
  );
}

export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return Response.json({ error: "id required" }, { status: 400 });

  await prisma.businessExpense.delete({ where: { id } });
  return Response.json({ ok: true });
}
