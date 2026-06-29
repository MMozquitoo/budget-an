import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const numMonths = Number(sp.get("months") || 6);
  const groupFilter = sp.get("group") || undefined;

  const latest = await prisma.personalTransaction.findFirst({
    orderBy: { date: "desc" },
    select: { date: true },
  });

  if (!latest) return Response.json([]);

  const end = new Date(latest.date);
  const endYear = end.getFullYear();
  const endMonth = end.getMonth(); // 0-indexed

  const startDate = new Date(endYear, endMonth - numMonths + 1, 1);
  const endDate = new Date(endYear, endMonth + 1, 0, 23, 59, 59);

  const where: Record<string, unknown> = {
    date: { gte: startDate, lte: endDate },
    parentId: null, // exclude split children from totals
  };
  if (groupFilter) {
    where.group = groupFilter;
  }

  const transactions = await prisma.personalTransaction.findMany({
    where,
    orderBy: { date: "asc" },
  });

  // Build monthly buckets
  const buckets: Map<
    string,
    { year: number; month: number; byGroup: Record<string, number>; byCategory: Record<string, number> }
  > = new Map();

  // Pre-fill all months so there are no gaps
  for (let i = 0; i < numMonths; i++) {
    const d = new Date(endYear, endMonth - numMonths + 1 + i, 1);
    const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
    buckets.set(key, { year: d.getFullYear(), month: d.getMonth() + 1, byGroup: {}, byCategory: {} });
  }

  for (const t of transactions) {
    const amt = Number(t.amount);
    const d = new Date(t.date);
    const key = `${d.getFullYear()}-${d.getMonth() + 1}`;

    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = { year: d.getFullYear(), month: d.getMonth() + 1, byGroup: {}, byCategory: {} };
      buckets.set(key, bucket);
    }

    bucket.byGroup[t.group] = (bucket.byGroup[t.group] || 0) + amt;
    bucket.byCategory[t.category] = (bucket.byCategory[t.category] || 0) + amt;
  }

  const months = Array.from(buckets.values()).sort(
    (a, b) => a.year - b.year || a.month - b.month
  );

  return Response.json(months);
}
