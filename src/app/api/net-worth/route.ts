import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";
import { safe, badRequest } from "@/lib/api";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serialize(s: { id: string; month: number; year: number; cash: any; savings: any; investments: any; property: any; debt: any; notes: string | null; createdAt: Date }) {
  const cash = Number(s.cash);
  const savings = Number(s.savings);
  const investments = Number(s.investments);
  const property = Number(s.property);
  const debt = Number(s.debt);
  return {
    id: s.id,
    month: s.month,
    year: s.year,
    cash,
    savings,
    investments,
    property,
    debt,
    total: cash + savings + investments + property - debt,
    notes: s.notes,
    createdAt: s.createdAt,
  };
}

export const GET = safe(async () => {
  const snapshots = await prisma.netWorthSnapshot.findMany({
    orderBy: [{ year: "asc" }, { month: "asc" }],
  });

  return Response.json(snapshots.map(serialize));
});

export const POST = safe(async (request: NextRequest) => {
  const body = await request.json();

  if (!body.month || !body.year) return badRequest("month and year required");

  const snapshot = await prisma.netWorthSnapshot.upsert({
    where: { month_year: { month: body.month, year: body.year } },
    update: {
      cash: body.cash ?? 0,
      savings: body.savings ?? 0,
      investments: body.investments ?? 0,
      property: body.property ?? 0,
      debt: body.debt ?? 0,
      notes: body.notes ?? null,
    },
    create: {
      month: body.month,
      year: body.year,
      cash: body.cash ?? 0,
      savings: body.savings ?? 0,
      investments: body.investments ?? 0,
      property: body.property ?? 0,
      debt: body.debt ?? 0,
      notes: body.notes ?? null,
    },
  });

  return Response.json(serialize(snapshot), { status: 201 });
});

export const DELETE = safe(async (request: NextRequest) => {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return badRequest("id required");

  await prisma.netWorthSnapshot.delete({ where: { id } });
  return Response.json({ ok: true });
});
