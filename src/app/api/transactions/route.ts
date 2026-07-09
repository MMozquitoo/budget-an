import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";
import { TransactionGroup, TransactionCategory } from "@/generated/prisma/client";
import { safe, isEnumValue, toFiniteNumber, toValidDate, badRequest } from "@/lib/api";

export const GET = safe(async (request: NextRequest) => {
  const sp = request.nextUrl.searchParams;
  const month = sp.get("month");
  const year = sp.get("year");
  const group = sp.get("group");

  const where: Record<string, unknown> = {};

  if (month && year) {
    const startDate = new Date(Number(year), Number(month) - 1, 1);
    const endDate = new Date(Number(year), Number(month), 0, 23, 59, 59);
    where.date = { gte: startDate, lte: endDate };
  }

  if (group && group in TransactionGroup) {
    where.group = group;
  }

  const recurring = sp.get("recurring");
  if (recurring === "true") {
    where.recurring = true;
  }

  const transactions = await prisma.personalTransaction.findMany({
    where,
    orderBy: { date: "desc" },
  });

  return Response.json(
    transactions.map((t) => ({ ...t, amount: Number(t.amount) }))
  );
});

export const POST = safe(async (request: NextRequest) => {
  const body = await request.json();

  if (!isEnumValue(body.group, TransactionGroup)) {
    return badRequest("Invalid group");
  }
  if (!isEnumValue(body.category, TransactionCategory)) {
    return badRequest("Invalid category");
  }
  const amount = toFiniteNumber(body.amount);
  if (amount === undefined) {
    return badRequest("Invalid amount");
  }
  const date = toValidDate(body.date);
  if (date === undefined) {
    return badRequest("Invalid date");
  }

  const transaction = await prisma.personalTransaction.create({
    data: {
      date,
      amount,
      group: body.group,
      category: body.category,
      description: body.description,
      notes: body.notes || null,
      recurring: body.recurring || false,
    },
  });

  return Response.json(
    { ...transaction, amount: Number(transaction.amount) },
    { status: 201 }
  );
});

export const DELETE = safe(async (request: NextRequest) => {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return badRequest("id required");

  await prisma.personalTransaction.delete({ where: { id } });
  return Response.json({ ok: true });
});
