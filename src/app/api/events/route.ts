import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const businessLineId = searchParams.get("businessLineId");
  const status = searchParams.get("status");

  const where: Record<string, unknown> = {};

  if (businessLineId) where.businessLineId = businessLineId;
  if (status) where.status = status;

  const events = await prisma.event.findMany({
    where,
    include: { businessLine: true },
    orderBy: { date: "desc" },
  });

  return Response.json(
    events.map((e) => ({
      ...e,
      revenue: Number(e.revenue),
      cost: Number(e.cost),
    }))
  );
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  const event = await prisma.event.create({
    data: {
      name: body.name,
      date: new Date(body.date),
      revenue: body.revenue,
      cost: body.cost,
      businessLineId: body.businessLineId,
      status: body.status,
      notes: body.notes,
    },
    include: { businessLine: true },
  });

  return Response.json(
    {
      ...event,
      revenue: Number(event.revenue),
      cost: Number(event.cost),
    },
    { status: 201 }
  );
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const { id } = body;

  if (!id) return Response.json({ error: "id required" }, { status: 400 });

  const data: Record<string, unknown> = {};
  if (body.name) data.name = body.name;
  if (body.date) data.date = new Date(body.date);
  if (body.revenue !== undefined) data.revenue = body.revenue;
  if (body.cost !== undefined) data.cost = body.cost;
  if (body.businessLineId) data.businessLineId = body.businessLineId;
  if (body.status) data.status = body.status;
  if (body.notes !== undefined) data.notes = body.notes;

  const event = await prisma.event.update({
    where: { id },
    data,
    include: { businessLine: true },
  });

  return Response.json({
    ...event,
    revenue: Number(event.revenue),
    cost: Number(event.cost),
  });
}

export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return Response.json({ error: "id required" }, { status: 400 });

  await prisma.event.delete({ where: { id } });
  return Response.json({ ok: true });
}
