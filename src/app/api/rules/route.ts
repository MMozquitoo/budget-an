import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";
import { TransactionGroup, TransactionCategory, MatchType } from "@/generated/prisma/client";
import { safe, isEnumValue, badRequest } from "@/lib/api";
import { isCategoryInGroup, validateRegex } from "@/lib/rules";

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
  if (!isCategoryInGroup(body.group, body.category)) {
    return badRequest(
      `La catégorie ${body.category} n'appartient pas au groupe ${body.group}`
    );
  }
  if (typeof body.matchValue !== "string" || !body.matchValue.trim()) {
    return badRequest("matchValue requis");
  }
  // Rule patterns are evaluated server-side on every imported row — reject the
  // ones that could stall the request before they reach the database.
  if (body.matchType === "REGEX") {
    const check = validateRegex(body.matchValue);
    if (!check.ok) return badRequest(check.error!);
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
