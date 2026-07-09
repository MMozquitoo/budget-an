import { prisma } from "@/lib/prisma";
import { monthRange } from "@/lib/utils";
import { safe, toFiniteNumber, toValidDate, badRequest } from "@/lib/api";
import { NextRequest } from "next/server";

export const GET = safe(async (request: NextRequest) => {
  const searchParams = request.nextUrl.searchParams;
  const month = searchParams.get("month");
  const year = searchParams.get("year");
  const businessLineId = searchParams.get("businessLineId");

  const where: Record<string, unknown> = {};

  if (month && year) {
    where.date = monthRange(Number(year), Number(month));
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
});

export const POST = safe(async (request: NextRequest) => {
  const body = await request.json();

  const hours = toFiniteNumber(body.hours);
  if (hours === undefined) return badRequest("Invalid hours");
  const date = toValidDate(body.date);
  if (date === undefined) return badRequest("Invalid date");

  const entry = await prisma.timeEntry.create({
    data: {
      date,
      hours,
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
});

export const DELETE = safe(async (request: NextRequest) => {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return badRequest("id required");

  await prisma.timeEntry.delete({ where: { id } });
  return Response.json({ ok: true });
});
