import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const month = searchParams.get("month");
  const year = searchParams.get("year");
  const businessLineId = searchParams.get("businessLineId");

  const where: Record<string, unknown> = {};

  if (month && year) {
    const startDate = new Date(Number(year), Number(month) - 1, 1);
    const endDate = new Date(Number(year), Number(month), 0, 23, 59, 59);
    where.date = { gte: startDate, lte: endDate };
  }

  if (businessLineId) where.businessLineId = businessLineId;

  const entries = await prisma.timeEntry.findMany({
    where,
    include: { businessLine: true, event: true },
    orderBy: { date: "desc" },
  });

  return Response.json(
    entries.map((e) => ({
      ...e,
      hours: Number(e.hours),
    }))
  );
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  const entry = await prisma.timeEntry.create({
    data: {
      date: new Date(body.date),
      hours: body.hours,
      type: body.type,
      businessLineId: body.businessLineId,
      eventId: body.eventId,
      projectName: body.projectName,
      notes: body.notes,
    },
    include: { businessLine: true, event: true },
  });

  return Response.json(
    { ...entry, hours: Number(entry.hours) },
    { status: 201 }
  );
}

export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return Response.json({ error: "id required" }, { status: 400 });

  await prisma.timeEntry.delete({ where: { id } });
  return Response.json({ ok: true });
}
