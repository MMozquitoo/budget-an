import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";
import { safe, badRequest } from "@/lib/api";

export const GET = safe(async () => {
  const snapshots = await prisma.wealthSnapshot.findMany({
    orderBy: [{ year: "desc" }, { month: "desc" }],
  });

  return Response.json(
    snapshots.map((s) => ({
      ...s,
      cashPersonal: Number(s.cashPersonal),
      cashBusiness: Number(s.cashBusiness),
      emergencyFund: Number(s.emergencyFund),
      investments: Number(s.investments),
      debt: Number(s.debt),
      butterflyValue: Number(s.butterflyValue),
    }))
  );
});

export const POST = safe(async (request: NextRequest) => {
  const body = await request.json();

  if (!body.month || !body.year) return badRequest("month and year required");

  const snapshot = await prisma.wealthSnapshot.upsert({
    where: {
      month_year: {
        month: body.month,
        year: body.year,
      },
    },
    update: {
      cashPersonal: body.cashPersonal,
      cashBusiness: body.cashBusiness,
      emergencyFund: body.emergencyFund,
      investments: body.investments,
      debt: body.debt,
      butterflyValue: body.butterflyValue,
    },
    create: {
      month: body.month,
      year: body.year,
      cashPersonal: body.cashPersonal,
      cashBusiness: body.cashBusiness,
      emergencyFund: body.emergencyFund,
      investments: body.investments,
      debt: body.debt,
      butterflyValue: body.butterflyValue,
    },
  });

  return Response.json(
    {
      ...snapshot,
      cashPersonal: Number(snapshot.cashPersonal),
      cashBusiness: Number(snapshot.cashBusiness),
      emergencyFund: Number(snapshot.emergencyFund),
      investments: Number(snapshot.investments),
      debt: Number(snapshot.debt),
      butterflyValue: Number(snapshot.butterflyValue),
    },
    { status: 201 }
  );
});
