import { NextRequest } from "next/server";
import { safe } from "@/lib/api";
import { getCurrentMonth, getCurrentYear } from "@/lib/utils";
import { getMonthSummary } from "@/lib/dashboard-data";

export const GET = safe(async (request: NextRequest) => {
  const sp = request.nextUrl.searchParams;
  const month = Number(sp.get("month") || getCurrentMonth());
  const year = Number(sp.get("year") || getCurrentYear());

  if (!Number.isInteger(month) || month < 1 || month > 12) {
    return Response.json({ error: "Mois invalide" }, { status: 400 });
  }
  if (!Number.isInteger(year) || year < 1970 || year > 3000) {
    return Response.json({ error: "Année invalide" }, { status: 400 });
  }

  return Response.json(await getMonthSummary(month, year));
});
