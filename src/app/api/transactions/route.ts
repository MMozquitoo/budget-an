import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";
import { TransactionGroup, TransactionCategory } from "@/generated/prisma/client";

export async function GET(request: NextRequest) {
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
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  if (!(body.group in TransactionGroup)) {
    return Response.json({ error: "Invalid group" }, { status: 400 });
  }
  if (!(body.category in TransactionCategory)) {
    return Response.json({ error: "Invalid category" }, { status: 400 });
  }

  const transaction = await prisma.personalTransaction.create({
    data: {
      date: new Date(body.date),
      amount: body.amount,
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
}

export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return Response.json({ error: "id required" }, { status: 400 });

  await prisma.personalTransaction.delete({ where: { id } });
  return Response.json({ ok: true });
}
