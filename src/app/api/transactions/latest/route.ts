import { safe } from "@/lib/api";
import { getLatestMonth } from "@/lib/dashboard-data";

/** The month the app should open on: the month of the most recent transaction. */
export const GET = safe(async () => {
  return Response.json(await getLatestMonth());
});
