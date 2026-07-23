import { NextRequest } from "next/server";
import { safe, toFiniteNumber } from "@/lib/api";
import { computeForecast } from "@/lib/forecast-data";

// GET /api/forecast?months=6&horizon=6&startingBalance=
// Projects the account balance forward from recent average cash flow.
export const GET = safe(async (request: NextRequest) => {
  const sp = request.nextUrl.searchParams;
  const months = toFiniteNumber(sp.get("months")) ?? 6;
  const horizon = toFiniteNumber(sp.get("horizon")) ?? 6;
  const startingBalance = toFiniteNumber(sp.get("startingBalance"));

  const result = await computeForecast(months, horizon, startingBalance);
  return Response.json(result);
});
