import { NextRequest } from "next/server";
import { safe, toFiniteNumber } from "@/lib/api";
import { computeInsights } from "@/lib/insights-data";

// GET /api/insights?month=&year=&months=6
// Analyse (movements, savings trend, budget snapshot) + ranked recommendations.
export const GET = safe(async (request: NextRequest) => {
  const sp = request.nextUrl.searchParams;
  const month = toFiniteNumber(sp.get("month")) ?? null;
  const year = toFiniteNumber(sp.get("year")) ?? null;
  const months = toFiniteNumber(sp.get("months")) ?? 6;

  const insights = await computeInsights(month, year, months);
  return Response.json(insights);
});
