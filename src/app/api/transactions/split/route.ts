import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";
import { safe, isValidKey, toFiniteNumber, badRequest } from "@/lib/api";
import { getTaxonomy } from "@/lib/taxonomy";

export const POST = safe(async (request: NextRequest) => {
  const body = await request.json();
  const { parentId, splits } = body as {
    parentId: string;
    splits: Array<{
      amount: number;
      group: string;
      category: string;
      description?: string;
    }>;
  };

  if (!parentId || !splits || splits.length < 2) {
    return badRequest("parentId and at least 2 splits required");
  }

  const parent = await prisma.personalTransaction.findUnique({
    where: { id: parentId },
  });

  if (!parent) {
    return Response.json({ error: "Transaction not found" }, { status: 404 });
  }

  // A parent that was already split (or is itself a split child) must not be
  // split again — that would append a second set of children and stop them
  // reconciling to the parent.
  if (parent.parentId) {
    return badRequest("Cette transaction est déjà une sous-transaction");
  }
  const existingChildren = await prisma.personalTransaction.count({
    where: { parentId: parent.id },
  });
  if (existingChildren > 0) {
    return badRequest("Cette transaction est déjà divisée");
  }

  // Validate every split's amount up front so a missing/NaN amount can't slip
  // past the equality check below (any comparison with NaN is false).
  const taxonomy = await getTaxonomy();
  const amounts: number[] = [];
  for (const s of splits) {
    if (!isValidKey(s.group, taxonomy.groupLabels)) {
      return badRequest(`Invalid group: ${s.group}`);
    }
    if (!isValidKey(s.category, taxonomy.categoryLabels)) {
      return badRequest(`Invalid category: ${s.category}`);
    }
    const amt = toFiniteNumber(s.amount);
    if (amt === undefined) {
      return badRequest("Chaque sous-transaction doit avoir un montant valide");
    }
    amounts.push(amt);
  }

  const splitTotal = amounts.reduce((sum, a) => sum + a, 0);
  const parentAmount = Number(parent.amount);
  if (Math.abs(splitTotal - parentAmount) > 0.01) {
    return badRequest(
      `Split amounts (${splitTotal}) must equal parent amount (${parentAmount})`
    );
  }

  const created = await prisma.$transaction(
    splits.map((s, i) =>
      prisma.personalTransaction.create({
        data: {
          date: parent.date,
          amount: amounts[i],
          group: s.group,
          category: s.category,
          description: s.description || parent.displayName || parent.description,
          notes: parent.notes,
          recurring: parent.recurring,
          parentId: parent.id,
          manuallyClassified: true,
        },
      })
    )
  );

  return Response.json(
    created.map((t) => ({ ...t, amount: Number(t.amount) })),
    { status: 201 }
  );
});
