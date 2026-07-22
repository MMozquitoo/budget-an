import { prisma } from "@/lib/prisma";
import { safe } from "@/lib/api";
import { monthPartsInZone, getCurrentMonth, getCurrentYear } from "@/lib/utils";

/** The month the app should open on: the month of the most recent transaction. */
export const GET = safe(async () => {
  const latest = await prisma.personalTransaction.findFirst({
    orderBy: { date: "desc" },
    select: { date: true },
  });

  if (!latest) {
    return Response.json({ month: getCurrentMonth(), year: getCurrentYear() });
  }

  // Read in Paris: a row stored at UTC noon is unambiguous, but legacy rows at
  // local midnight would otherwise report the previous month on a UTC server.
  return Response.json(monthPartsInZone(latest.date));
});
