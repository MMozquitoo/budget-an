import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";
import { TransactionGroup, TransactionCategory } from "@/generated/prisma/client";

export async function POST(request: NextRequest) {
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
    return Response.json(
      { error: "parentId and at least 2 splits required" },
      { status: 400 }
    );
  }

  const parent = await prisma.personalTransaction.findUnique({
    where: { id: parentId },
  });

  if (!parent) {
    return Response.json({ error: "Transaction not found" }, { status: 404 });
  }

  for (const s of splits) {
    if (!(s.group in TransactionGroup)) {
      return Response.json({ error: `Invalid group: ${s.group}` }, { status: 400 });
    }
    if (!(s.category in TransactionCategory)) {
      return Response.json({ error: `Invalid category: ${s.category}` }, { status: 400 });
    }
  }

  const splitTotal = splits.reduce((sum, s) => sum + s.amount, 0);
  const parentAmount = Number(parent.amount);
  if (Math.abs(splitTotal - parentAmount) > 0.01) {
    return Response.json(
      { error: `Split amounts (${splitTotal}) must equal parent amount (${parentAmount})` },
      { status: 400 }
    );
  }

  const created = await prisma.$transaction(
    splits.map((s) =>
      prisma.personalTransaction.create({
        data: {
          date: parent.date,
          amount: s.amount,
          group: s.group as TransactionGroup,
          category: s.category as TransactionCategory,
          description: s.description || parent.description,
          notes: parent.notes,
          recurring: parent.recurring,
          parentId: parent.id,
        },
      })
    )
  );

  return Response.json(
    created.map((t) => ({ ...t, amount: Number(t.amount) })),
    { status: 201 }
  );
}
