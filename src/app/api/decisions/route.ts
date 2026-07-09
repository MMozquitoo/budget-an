import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";
import { safe, toValidDate, badRequest } from "@/lib/api";

export const GET = safe(async () => {
  const decisions = await prisma.decision.findMany({
    include: { businessLine: true, event: true },
    orderBy: { date: "desc" },
  });

  return Response.json(
    decisions.map((d) => ({
      ...d,
      amount: d.amount ? Number(d.amount) : null,
    }))
  );
});

export const POST = safe(async (request: NextRequest) => {
  const body = await request.json();

  const date = toValidDate(body.date);
  if (date === undefined) return badRequest("Invalid date");

  const decision = await prisma.decision.create({
    data: {
      date,
      scope: body.scope,
      title: body.title,
      amount: body.amount,
      thresholdTriggered: body.thresholdTriggered ?? false,
      category: body.category,
      businessLineId: body.businessLineId,
      eventId: body.eventId,
      rationale: body.rationale,
      expectedROI: body.expectedROI,
      status: body.status || "PLANNED",
      reviewDate: body.reviewDate ? new Date(body.reviewDate) : null,
    },
    include: { businessLine: true, event: true },
  });

  return Response.json(
    { ...decision, amount: decision.amount ? Number(decision.amount) : null },
    { status: 201 }
  );
});

export const PUT = safe(async (request: NextRequest) => {
  const body = await request.json();
  const { id } = body;

  if (!id) return badRequest("id required");

  const data: Record<string, unknown> = {};
  if (body.date) data.date = new Date(body.date);
  if (body.scope) data.scope = body.scope;
  if (body.title) data.title = body.title;
  if (body.amount !== undefined) data.amount = body.amount;
  if (body.thresholdTriggered !== undefined) data.thresholdTriggered = body.thresholdTriggered;
  if (body.category) data.category = body.category;
  if (body.businessLineId !== undefined) data.businessLineId = body.businessLineId;
  if (body.eventId !== undefined) data.eventId = body.eventId;
  if (body.rationale !== undefined) data.rationale = body.rationale;
  if (body.expectedROI !== undefined) data.expectedROI = body.expectedROI;
  if (body.actualROI !== undefined) data.actualROI = body.actualROI;
  if (body.status) data.status = body.status;
  if (body.reviewDate !== undefined) data.reviewDate = body.reviewDate ? new Date(body.reviewDate) : null;

  const decision = await prisma.decision.update({
    where: { id },
    data,
    include: { businessLine: true, event: true },
  });

  return Response.json({
    ...decision,
    amount: decision.amount ? Number(decision.amount) : null,
  });
});

export const DELETE = safe(async (request: NextRequest) => {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return badRequest("id required");

  await prisma.decision.delete({ where: { id } });
  return Response.json({ ok: true });
});
