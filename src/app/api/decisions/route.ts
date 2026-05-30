import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

export async function GET() {
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
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  const decision = await prisma.decision.create({
    data: {
      date: new Date(body.date),
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
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const { id, ...fields } = body;

  if (!id) return Response.json({ error: "id required" }, { status: 400 });

  if (fields.date) fields.date = new Date(fields.date);
  if (fields.reviewDate) fields.reviewDate = new Date(fields.reviewDate);

  const decision = await prisma.decision.update({
    where: { id },
    data: fields,
    include: { businessLine: true, event: true },
  });

  return Response.json({
    ...decision,
    amount: decision.amount ? Number(decision.amount) : null,
  });
}

export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return Response.json({ error: "id required" }, { status: 400 });

  await prisma.decision.delete({ where: { id } });
  return Response.json({ ok: true });
}
