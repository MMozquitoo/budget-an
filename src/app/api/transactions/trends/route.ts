import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";
import { safe } from "@/lib/api";
import { monthPartsInZone, monthKeyInZone, monthRange, shiftMonth } from "@/lib/utils";

interface Bucket {
  year: number;
  month: number;
  byGroup: Record<string, number>;
  byCategory: Record<string, number>;
}

export const GET = safe(async (request: NextRequest) => {
  const sp = request.nextUrl.searchParams;
  const requested = Number(sp.get("months") || 6);
  const numMonths = Number.isInteger(requested)
    ? Math.min(Math.max(requested, 1), 60)
    : 6;
  const groupFilter = sp.get("group") || undefined;

  const latest = await prisma.personalTransaction.findFirst({
    orderBy: { date: "desc" },
    select: { date: true },
  });

  if (!latest) return Response.json([]);

  // Anchor the window on the month of the latest transaction, read in Paris —
  // bucketing with the server's local getMonth() shifted 1st-of-month rows.
  const end = monthPartsInZone(latest.date);
  const start = shiftMonth(end.year, end.month, -(numMonths - 1));

  const where: Record<string, unknown> = {
    date: {
      gte: monthRange(start.year, start.month).gte,
      lt: monthRange(end.year, end.month).lt,
    },
    parentId: null, // exclude split children from totals
  };
  if (groupFilter) {
    where.group = groupFilter;
  }

  const transactions = await prisma.personalTransaction.findMany({
    where,
    orderBy: { date: "asc" },
    select: { date: true, amount: true, group: true, category: true },
  });

  // Pre-fill every month so the chart has no gaps.
  const buckets = new Map<string, Bucket>();
  for (let i = 0; i < numMonths; i++) {
    const { year, month } = shiftMonth(start.year, start.month, i);
    buckets.set(`${year}-${String(month).padStart(2, "0")}`, {
      year,
      month,
      byGroup: {},
      byCategory: {},
    });
  }

  for (const t of transactions) {
    const key = monthKeyInZone(t.date);
    let bucket = buckets.get(key);
    if (!bucket) {
      const [y, m] = key.split("-");
      bucket = { year: Number(y), month: Number(m), byGroup: {}, byCategory: {} };
      buckets.set(key, bucket);
    }
    const amt = Number(t.amount);
    bucket.byGroup[t.group] = (bucket.byGroup[t.group] || 0) + amt;
    bucket.byCategory[t.category] = (bucket.byCategory[t.category] || 0) + amt;
  }

  const months = Array.from(buckets.values()).sort(
    (a, b) => a.year - b.year || a.month - b.month
  );

  return Response.json(months);
});
