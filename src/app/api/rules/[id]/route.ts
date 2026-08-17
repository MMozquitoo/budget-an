import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";
import { MatchType } from "@/generated/prisma/client";
import { safe, isEnumValue, isValidKey, badRequest } from "@/lib/api";
import { isCategoryInGroup, validateRegex } from "@/lib/rules";
import { getTaxonomy } from "@/lib/taxonomy";

export const PUT = safe(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id } = await params;
  const body = await request.json();
  const taxonomy = await getTaxonomy();

  if (body.group && !isValidKey(body.group, taxonomy.groupLabels)) {
    return badRequest("Invalid group");
  }
  if (body.category && !isValidKey(body.category, taxonomy.categoryLabels)) {
    return badRequest("Invalid category");
  }
  if (body.matchType && !isEnumValue(body.matchType, MatchType)) {
    return badRequest("Invalid matchType");
  }

  // A partial update can still produce an incoherent rule, so validate the
  // group/category pair as it will be after the merge, not just what was sent.
  const existing = await prisma.classificationRule.findUnique({ where: { id } });
  if (!existing) return Response.json({ error: "Introuvable" }, { status: 404 });

  const group = body.group ?? existing.group;
  const category = body.category ?? existing.category;
  if (!isCategoryInGroup(group, category, taxonomy.categoriesByGroup)) {
    return badRequest(`La catégorie ${category} n'appartient pas au groupe ${group}`);
  }

  const matchType = body.matchType ?? existing.matchType;
  const matchValue = body.matchValue ?? existing.matchValue;
  if (matchType === "REGEX") {
    const check = validateRegex(matchValue);
    if (!check.ok) return badRequest(check.error!);
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
