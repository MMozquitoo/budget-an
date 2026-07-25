import { NextRequest } from "next/server";
import { safe, badRequest, toFiniteNumber } from "@/lib/api";
import { getAccountBreakdown } from "@/lib/dashboard-data";

// GET /api/accounts?month=&year= → spend/income per source account for the month.
export const GET = safe(async (request: NextRequest) => {
  const sp = request.nextUrl.searchParams;
  const month = toFiniteNumber(sp.get("month"));
  const year = toFiniteNumber(sp.get("year"));
  if (!month || !year) return badRequest("month and year required");

  return Response.json(await getAccountBreakdown(month, year));
});
