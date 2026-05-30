import { prisma } from "@/lib/prisma";

export async function GET() {
  // Find the latest month that has BOTH household expenses and revenue
  const latestRevenue = await prisma.revenue.findFirst({
    orderBy: { date: "desc" },
    select: { date: true },
  });

  if (latestRevenue) {
    return Response.json({
      month: latestRevenue.date.getMonth() + 1,
      year: latestRevenue.date.getFullYear(),
    });
  }

  // Fallback to latest household expense
  const latestHousehold = await prisma.householdExpense.findFirst({
    orderBy: { date: "desc" },
    select: { date: true },
  });

  if (latestHousehold) {
    return Response.json({
      month: latestHousehold.date.getMonth() + 1,
      year: latestHousehold.date.getFullYear(),
    });
  }

  return Response.json({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
  });
}
