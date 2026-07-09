import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";
import { TransactionGroup, TransactionCategory, MatchType } from "@/generated/prisma/client";
import { safe, isEnumValue, badRequest } from "@/lib/api";

export const PUT = safe(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id } = await params;
  const body = await request.json();

  if (body.group && !isEnumValue(body.group, TransactionGroup)) {
    return badRequest("Invalid group");
  }
  if (body.category && !isEnumValue(body.category, TransactionCategory)) {
    return badRequest("Invalid category");
  }
  if (body.matchType && !isEnumValue(body.matchType, MatchType)) {
    return badRequest("Invalid matchType");
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
});
