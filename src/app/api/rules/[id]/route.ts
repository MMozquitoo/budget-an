import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";
import { TransactionGroup, TransactionCategory, MatchType } from "@/generated/prisma/client";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  if (body.group && !(body.group in TransactionGroup)) {
    return Response.json({ error: "Invalid group" }, { status: 400 });
  }
  if (body.category && !(body.category in TransactionCategory)) {
    return Response.json({ error: "Invalid category" }, { status: 400 });
  }
  if (body.matchType && !(body.matchType in MatchType)) {
    return Response.json({ error: "Invalid matchType" }, { status: 400 });
  }

  const rule = await prisma.classificationRule.update({
    where: { id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.priority !== undefined && { priority: body.priority }),
      ...(body.matchField !== undefined && { matchField: body.matchField }),
      ...(body.matchType !== undefined && { matchType: body.matchType }),
      ...(body.matchValue !== undefined && { matchValue: body.matchValue }),
      ...(body.group !== undefined && { group: body.group }),
      ...(body.category !== undefined && { category: body.category }),
      ...(body.active !== undefined && { active: body.active }),
    },
  });

  return Response.json(rule);
}
