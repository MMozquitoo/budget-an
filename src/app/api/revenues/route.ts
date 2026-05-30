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

  const revenues = await prisma.revenue.findMany({
    where,
    include: { businessLine: true },
    orderBy: { date: "desc" },
  });

  return Response.json(
    revenues.map((r) => ({
      ...r,
      amount: Number(r.amount),
    }))
  );
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  const revenue = await prisma.revenue.create({
    data: {
      date: new Date(body.date),
      amount: body.amount,
      description: body.description,
      client: body.client,
      businessLineId: body.businessLineId,
    },
    include: { businessLine: true },
  });

  return Response.json(
    { ...revenue, amount: Number(revenue.amount) },
    { status: 201 }
  );
}

export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return Response.json({ error: "id required" }, { status: 400 });

  await prisma.revenue.delete({ where: { id } });
  return Response.json({ ok: true });
}
