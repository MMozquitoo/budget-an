import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";
import { TransactionCategory } from "@/generated/prisma/client";
import { safe, badRequest, toFiniteNumber, toValidDate } from "@/lib/api";
import { isCategoryInGroup } from "@/lib/rules";

// PUT /api/savings-goals/:id — partial update.
export const PUT = safe(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id } = await params;
  const body = await request.json();

  const data: {
    name?: string;
    targetAmount?: number;
    targetDate?: Date;
    startDate?: Date;
    category?: TransactionCategory | null;
  } = {};

  if (body.name !== undefined) {
    if (typeof body.name !== "string" || !body.name.trim()) return badRequest("name invalide");
    data.name = body.name.trim();
  }
  if (body.targetAmount !== undefined) {
    const amount = toFiniteNumber(body.targetAmount);
    if (amount === undefined || amount <= 0) return badRequest("targetAmount invalide");
    data.targetAmount = amount;
  }
  if (body.targetDate !== undefined) {
    const d = toValidDate(body.targetDate);
    if (!d) return badRequest("targetDate invalide");
    data.targetDate = d;
  }
  if (body.startDate !== undefined) {
    const d = toValidDate(body.startDate);
    if (!d) return badRequest("startDate invalide");
    data.startDate = d;
  }
  if (body.category !== undefined) {
    if (body.category === null || body.category === "") {
      data.category = null;
    } else {
      if (!isCategoryInGroup("SAVINGS", body.category)) {
        return badRequest(`${body.category} n'est pas une catégorie d'épargne`);
      }
      data.category = body.category as TransactionCategory;
    }
  }

  const goal = await prisma.savingsGoal.update({ where: { id }, data });
  return Response.json({
    id: goal.id,
    name: goal.name,
    targetAmount: Number(goal.targetAmount),
    targetDate: goal.targetDate,
    startDate: goal.startDate,
    category: goal.category,
  });
});

// DELETE /api/savings-goals/:id
export const DELETE = safe(async (
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id } = await params;
  await prisma.savingsGoal.delete({ where: { id } });
  return Response.json({ ok: true });
});
