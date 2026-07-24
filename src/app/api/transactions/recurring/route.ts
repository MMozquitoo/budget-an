import { NextRequest } from "next/server";
import { safe } from "@/lib/api";
import { getRecurringData } from "@/lib/recurring-data";

/**
 * Subscriptions and recurring charges, derived from the transaction history
 * rather than the hand-set `recurring` flag (which no import ever writes).
 *
 * ?months=N  history window to analyse (default 18, max 60)
 * ?all=true  include series that have stopped arriving (cancelled subscriptions)
 */
export const GET = safe(async (request: NextRequest) => {
  const sp = request.nextUrl.searchParams;
  const months = Number(sp.get("months") || 18);
  const includeInactive = sp.get("all") === "true";

  const { series, summary } = await getRecurringData(months, includeInactive);
  return Response.json({ series, summary });
});
