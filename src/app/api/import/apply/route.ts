import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";
import { safe, badRequest } from "@/lib/api";
import { TransactionGroup, TransactionCategory } from "@/generated/prisma/client";
import { parseCSV, prepareRows, dedupe, csvDateRange } from "@/lib/import";

// POST /api/import/apply — insert only the CSV rows not already stored.
// Incremental and non-destructive: existing rows (reclassifications, splits,
// notes) are never touched.
export const POST = safe(async (request: NextRequest) => {
  const body = await request.json();
  const csv = typeof body.csv === "string" ? body.csv : "";
  if (!csv.trim()) return badRequest("CSV vide");

  const rows = parseCSV(csv);
  const rules = await prisma.classificationRule.findMany({
    where: { active: true },
    orderBy: { priority: "desc" },
  });
  const prep = prepareRows(rows, rules);

  const range = csvDateRange(prep.prepared);
  if (!range) return Response.json({ inserted: 0, message: "Rien à importer." });

  const existing = await prisma.personalTransaction.findMany({
    where: { date: { gte: range.from, lte: range.to }, parentId: null },
    select: { date: true, amount: true, description: true },
  });
  const { toInsert } = dedupe(
    prep.prepared,
    existing.map((e) => ({ date: e.date, amount: Number(e.amount), description: e.description }))
  );

  if (toInsert.length === 0) {
    return Response.json({ inserted: 0, message: "Rien de nouveau — déjà à jour." });
  }

  const created = await prisma.personalTransaction.createMany({
    data: toInsert.map((r) => ({
      date: r.date,
      amount: r.amount,
      group: r.group as TransactionGroup,
      category: r.category as TransactionCategory,
      description: r.description,
      notes: r.notes,
    })),
  });

  const total = await prisma.personalTransaction.count();
  return Response.json({ inserted: created.count, total });
});
