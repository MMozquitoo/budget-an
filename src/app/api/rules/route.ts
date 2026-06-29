import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";
import { TransactionGroup, TransactionCategory, MatchType } from "@/generated/prisma/client";

export async function GET() {
  const rules = await prisma.classificationRule.findMany({
    orderBy: { priority: "desc" },
  });

  return Response.json(rules);
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  if (!(body.group in TransactionGroup)) {
    return Response.json({ error: "Invalid group" }, { status: 400 });
  }
  if (!(body.category in TransactionCategory)) {
    return Response.json({ error: "Invalid category" }, { status: 400 });
  }
  if (body.matchType && !(body.matchType in MatchType)) {
    return Response.json({ error: "Invalid matchType" }, { status: 400 });
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
}

export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return Response.json({ error: "id required" }, { status: 400 });

  await prisma.classificationRule.delete({ where: { id } });
  return Response.json({ ok: true });
}
