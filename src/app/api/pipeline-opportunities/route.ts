import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const status = searchParams.get("status");
  const businessLineId = searchParams.get("businessLineId");

  const where: Record<string, unknown> = {};

  if (status) where.status = status;
  if (businessLineId) where.businessLineId = businessLineId;

  const opportunities = await prisma.pipelineOpportunity.findMany({
    where,
    include: { businessLine: true },
    orderBy: { closeDate: "asc" },
  });

  return Response.json(
    opportunities.map((o) => ({
      ...o,
      value: Number(o.value),
    }))
  );
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  const opportunity = await prisma.pipelineOpportunity.create({
    data: {
      account: body.account,
      value: body.value,
      probability: body.probability,
      closeDate: new Date(body.closeDate),
      owner: body.owner,
      businessLineId: body.businessLineId,
      notes: body.notes,
    },
    include: { businessLine: true },
  });

  return Response.json(
    { ...opportunity, value: Number(opportunity.value) },
    { status: 201 }
  );
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const { id } = body;

  if (!id) return Response.json({ error: "id required" }, { status: 400 });

  const data: Record<string, unknown> = {};
  if (body.account) data.account = body.account;
  if (body.value !== undefined) data.value = body.value;
  if (body.probability !== undefined) data.probability = body.probability;
  if (body.closeDate) data.closeDate = new Date(body.closeDate);
  if (body.owner !== undefined) data.owner = body.owner;
  if (body.businessLineId) data.businessLineId = body.businessLineId;
  if (body.status) data.status = body.status;
  if (body.notes !== undefined) data.notes = body.notes;

  const opportunity = await prisma.pipelineOpportunity.update({
    where: { id },
    data,
    include: { businessLine: true },
  });

  return Response.json({
    ...opportunity,
    value: Number(opportunity.value),
  });
}

export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return Response.json({ error: "id required" }, { status: 400 });

  await prisma.pipelineOpportunity.delete({ where: { id } });
  return Response.json({ ok: true });
}
