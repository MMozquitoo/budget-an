import { prisma } from "@/lib/prisma";

export async function GET() {
  const latest = await prisma.personalTransaction.findFirst({
    orderBy: { date: "desc" },
    select: { date: true },
  });

  if (!latest) {
    return Response.json({
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
    });
  }

  return Response.json({
    month: latest.date.getMonth() + 1,
    year: latest.date.getFullYear(),
  });
}
