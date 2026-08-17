import { prisma } from "@/lib/prisma";
import { getCurrentMonth, getCurrentYear, monthRange } from "@/lib/utils";
import { getTaxonomy } from "@/lib/taxonomy";
import CalendarClient from "./CalendarClient";

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; year?: string }>;
}) {
  const sp = await searchParams;
  const month = Number(sp.month) || getCurrentMonth();
  const year = Number(sp.year) || getCurrentYear();

  const [transactions, taxonomy] = await Promise.all([
    prisma.personalTransaction.findMany({
      where: { date: monthRange(year, month), parentId: null },
      orderBy: { date: "asc" },
      select: {
        id: true,
        date: true,
        amount: true,
        group: true,
        category: true,
        description: true,
      },
    }),
    getTaxonomy(),
  ]);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Calendrier</h1>
        <p className="text-sm text-gray-500">Vue journalière de tes opérations</p>
      </div>

      <CalendarClient
        transactions={transactions.map((t) => ({
          id: t.id,
          date: t.date.toISOString(),
          amount: Number(t.amount),
          group: t.group,
          category: t.category,
          description: t.description,
        }))}
        month={month}
        year={year}
        taxonomy={taxonomy}
      />
    </div>
  );
}
