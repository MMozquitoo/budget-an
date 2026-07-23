import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";
import { safe, badRequest, toFiniteNumber } from "@/lib/api";
import { accountBreakdown } from "@/lib/accounts";
import { monthRange } from "@/lib/utils";

// GET /api/accounts?month=&year= → spend/income per source account for the month.
export const GET = safe(async (request: NextRequest) => {
  const sp = request.nextUrl.searchParams;
  const month = toFiniteNumber(sp.get("month"));
  const year = toFiniteNumber(sp.get("year"));
  if (!month || !year) return badRequest("month and year required");

  const txs = await prisma.personalTransaction.findMany({
    where: { parentId: null, date: monthRange(year, month) },
    select: { notes: true, group: true, amount: true },
  });

  const accounts = accountBreakdown(
    txs.map((t) => ({ notes: t.notes, group: t.group, amount: Number(t.amount) }))
  );
  return Response.json({ month, year, accounts });
});
