import { NextRequest } from "next/server";
import { safe } from "@/lib/api";
import { getMonthlyTrends } from "@/lib/dashboard-data";

export const GET = safe(async (request: NextRequest) => {
  const sp = request.nextUrl.searchParams;
  const months = Number(sp.get("months") || 6);
  const groupFilter = sp.get("group") || undefined;

  return Response.json(await getMonthlyTrends(months, groupFilter));
});
