import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";
import { TransactionGroup, TransactionCategory } from "@/generated/prisma/client";
import { safe, isEnumValue, toFiniteNumber, toValidDate, badRequest } from "@/lib/api";
import { classify, isCategoryInGroup } from "@/lib/rules";
import { monthRange } from "@/lib/utils";

export const GET = safe(async (request: NextRequest) => {
  const sp = request.nextUrl.searchParams;
  const month = sp.get("month");
  const year = sp.get("year");
  const group = sp.get("group");

  const where: Record<string, unknown> = {};

  if (month && year) {
    const m = Number(month);
    const y = Number(year);
    if (!Number.isInteger(m) || m < 1 || m > 12) return badRequest("Mois invalide");
    if (!Number.isInteger(y) || y < 1970 || y > 3000) return badRequest("Année invalide");
    // Paris-anchored month window: a `new Date(y, m-1, 1)` boundary evaluated on
    // a UTC server pushes 1st-of-month rows into the previous month.
    where.date = monthRange(y, m);
  }

  if (group && group in TransactionGroup) {
    where.group = group;
  }

  const recurring = sp.get("recurring");
  if (recurring === "true") {
    where.recurring = true;
  }

  // Split children are hidden by default so listings and their totals reconcile
  // with the summary; ?includeSplits=true opts into the flat view.
  if (sp.get("includeSplits") !== "true") {
    where.parentId = null;
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

  const amount = toFiniteNumber(body.amount);
  if (amount === undefined) {
    return badRequest("Invalid amount");
  }
  const date = toValidDate(body.date);
  if (date === undefined) {
    return badRequest("Invalid date");
  }
  const description =
    typeof body.description === "string" ? body.description.trim() : "";
  if (!description) {
    return badRequest("Description requise");
  }

  let group = body.group;
  let category = body.category;

  // No classification supplied → let the rules decide, using the same engine as
  // the import, so a quick manual entry lands where an imported row would.
  if (group === undefined || category === undefined) {
    const rules = await prisma.classificationRule.findMany({
      where: { active: true },
      orderBy: { priority: "desc" },
    });
    const match = classify(rules, { description, notes: body.notes });
    if (!match) {
      return badRequest(
        "Aucune règle ne correspond — précise le groupe et la catégorie"
      );
    }
    group = match.group;
    category = match.category;
  }

  if (!isEnumValue(group, TransactionGroup)) {
    return badRequest("Invalid group");
  }
  if (!isEnumValue(category, TransactionCategory)) {
    return badRequest("Invalid category");
  }
  if (!isCategoryInGroup(group, category)) {
    return badRequest(
      `La catégorie ${category} n'appartient pas au groupe ${group}`
    );
  }

  const transaction = await prisma.personalTransaction.create({
    data: {
      date,
      amount,
      group,
      category,
      description,
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

  // Deleting a split parent has to take its children with it, otherwise the
  // foreign key rejects the delete and the row becomes undeletable from the UI.
  await prisma.$transaction([
    prisma.personalTransaction.deleteMany({ where: { parentId: id } }),
    prisma.personalTransaction.delete({ where: { id } }),
  ]);
  return Response.json({ ok: true });
});
