import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";
import { safe, badRequest } from "@/lib/api";
import { parseCSV, prepareRows, dedupe, csvDateRange, MAX_CSV_BYTES, MAX_CSV_ROWS } from "@/lib/import";

// POST /api/import/preview — parse + classify + dedup a CSV WITHOUT writing.
export const POST = safe(async (request: NextRequest) => {
  const body = await request.json();
  const csv = typeof body.csv === "string" ? body.csv : "";
  if (!csv.trim()) return badRequest("CSV vide");
  if (csv.length > MAX_CSV_BYTES) return badRequest("Fichier trop volumineux (max 2 Mo)");

  const rows = parseCSV(csv);
  if (rows.length > MAX_CSV_ROWS) return badRequest("Trop de lignes (max 20 000)");
  const rules = await prisma.classificationRule.findMany({
    where: { active: true },
    orderBy: { priority: "desc" },
  });
  const prep = prepareRows(rows, rules);

  const range = csvDateRange(prep.prepared);
  let toInsert = prep.prepared;
  let alreadyPresent = 0;
  if (range) {
    const existing = await prisma.personalTransaction.findMany({
      where: { date: { gte: range.from, lte: range.to }, parentId: null },
      select: { date: true, amount: true, description: true },
    });
    const dd = dedupe(
      prep.prepared,
      existing.map((e) => ({ date: e.date, amount: Number(e.amount), description: e.description }))
    );
    toInsert = dd.toInsert;
    alreadyPresent = dd.alreadyPresent;
  }

  return Response.json({
    parsed: rows.length,
    prepared: prep.prepared.length,
    byRule: prep.byRule,
    skippedTransfer: prep.skippedTransfer,
    skippedInvalid: prep.skippedInvalid,
    skippedUnmapped: prep.skippedUnmapped,
    unmapped: prep.unmapped.slice(0, 20),
    alreadyPresent,
    newCount: toInsert.length,
    range: range
      ? { from: range.from.toISOString().slice(0, 10), to: range.to.toISOString().slice(0, 10) }
      : null,
    preview: toInsert.slice(0, 50).map((d) => ({
      date: d.date.toISOString().slice(0, 10),
      amount: d.amount,
      group: d.group,
      category: d.category,
      description: d.description,
      ruleName: d.ruleName ?? null,
    })),
  });
});
