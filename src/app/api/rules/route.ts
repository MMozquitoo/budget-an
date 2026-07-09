import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";
import { TransactionGroup, TransactionCategory, MatchType } from "@/generated/prisma/client";
import { safe, isEnumValue, badRequest } from "@/lib/api";

export const GET = safe(async () => {
  const rules = await prisma.classificationRule.findMany({
    orderBy: { priority: "desc" },
  });

  return Response.json(rules);
});

export const POST = safe(async (request: NextRequest) => {
  const body = await request.json();

  if (!isEnumValue(body.group, TransactionGroup)) {
    return badRequest("Invalid group");
  }
  if (!isEnumValue(body.category, TransactionCategory)) {
    return badRequest("Invalid category");
  }
  if (body.matchType && !isEnumValue(body.matchType, MatchType)) {
    return badRequest("Invalid matchType");
  }

  const rule = await prisma.classificationRule.create({
    data: {
      name: body.name,
      priority: body.priority ?? 0,
      matchField: body.matchField ?? "description",
      matchType: body.matchType ?? "CONTAINS",
      matchValue: body.matchValue,
      group: body.group,
      category: body.category,
      active: body.active ?? true,
    },
  });

  return Response.json(rule, { status: 201 });
});

export const DELETE = safe(async (request: NextRequest) => {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return badRequest("id required");

  await prisma.classificationRule.delete({ where: { id } });
  return Response.json({ ok: true });
});
