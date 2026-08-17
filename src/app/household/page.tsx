import { prisma } from "@/lib/prisma";
import { monthRange } from "@/lib/utils";
import { getLatestMonth } from "@/lib/dashboard-data";
import { getTaxonomy } from "@/lib/taxonomy";
import HouseholdClient from "./HouseholdClient";

// month/year/group/category are all optional in the URL, so nothing forces
// dynamic rendering on its own — same fix as /dashboard and /net-worth.
export const dynamic = "force-dynamic";

export default async function HouseholdPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; year?: string; group?: string; category?: string }>;
}) {
  const sp = await searchParams;
  let month = sp.month ? Number(sp.month) : null;
  let year = sp.year ? Number(sp.year) : null;
  if (!month || !year) {
    const latest = await getLatestMonth();
    month = latest.month;
    year = latest.year;
  }

  const [rows, taxonomy] = await Promise.all([
    prisma.personalTransaction.findMany({
      where: { date: monthRange(year, month), parentId: null },
      orderBy: { date: "desc" },
    }),
    getTaxonomy(),
  ]);

  return (
    <HouseholdClient
      transactions={rows.map((t) => ({
        id: t.id,
        date: t.date.toISOString(),
        amount: Number(t.amount),
        group: t.group,
        category: t.category,
        description: t.description,
        notes: t.notes,
        recurring: t.recurring,
      }))}
      month={month}
      year={year}
      initialGroup={sp.group ?? "ALL"}
      initialCategory={sp.category ?? "ALL"}
      taxonomy={taxonomy}
    />
  );
}
