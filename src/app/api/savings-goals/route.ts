import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";
import { safe, badRequest, toFiniteNumber, toValidDate } from "@/lib/api";
import { isCategoryInGroup } from "@/lib/rules";
import { categoriesForGoal, buildGoalReport } from "@/lib/savings-goals";
import { getTaxonomy } from "@/lib/taxonomy";

// GET /api/savings-goals → every goal with progress derived from transactions.
export const GET = safe(async () => {
  const goals = await prisma.savingsGoal.findMany();
  if (goals.length === 0) return Response.json({ goals: [] });

  const taxonomy = await getTaxonomy();

  const withSaved = await Promise.all(
    goals.map(async (g) => {
      const agg = await prisma.personalTransaction.aggregate({
        where: {
          parentId: null,
          category: { in: categoriesForGoal(g.category, taxonomy.categoriesByGroup) },
          date: { gte: g.startDate },
        },
        _sum: { amount: true },
      });
      return { id: g.id, saved: Number(agg._sum?.amount ?? 0) };
    })
  );

  const lines = buildGoalReport(
    goals.map((g) => ({
      id: g.id,
      name: g.name,
      targetAmount: Number(g.targetAmount),
      targetDate: g.targetDate,
      startDate: g.startDate,
      category: g.category,
    })),
    Object.fromEntries(withSaved.map((w) => [w.id, w.saved]))
  );

  return Response.json({ goals: lines });
});

// POST /api/savings-goals — create a goal.
export const POST = safe(async (request: NextRequest) => {
  const body = await request.json();

  if (typeof body.name !== "string" || !body.name.trim()) {
    return badRequest("name requis");
  }
  const targetAmount = toFiniteNumber(body.targetAmount);
  if (targetAmount === undefined || targetAmount <= 0) {
    return badRequest("targetAmount doit être positif");
  }
  const targetDate = toValidDate(body.targetDate);
  if (!targetDate) return badRequest("targetDate invalide");

  const startDate = body.startDate ? toValidDate(body.startDate) : new Date();
  if (!startDate) return badRequest("startDate invalide");

  let category: string | null = null;
  if (body.category !== undefined && body.category !== null && body.category !== "") {
    const taxonomy = await getTaxonomy();
    if (!isCategoryInGroup("SAVINGS", body.category, taxonomy.categoriesByGroup)) {
      return badRequest(`${body.category} n'est pas une catégorie d'épargne`);
    }
    category = body.category as string;
  }

  const goal = await prisma.savingsGoal.create({
    data: { name: body.name.trim(), targetAmount, targetDate, startDate, category },
  });

  return Response.json(
    {
      id: goal.id,
      name: goal.name,
      targetAmount: Number(goal.targetAmount),
      targetDate: goal.targetDate,
      startDate: goal.startDate,
      category: goal.category,
      saved: 0,
      remaining: Number(goal.targetAmount),
      pct: 0,
      health: "on-track" as const,
    },
    { status: 201 }
  );
});
