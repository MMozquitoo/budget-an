import { prisma } from "@/lib/prisma";
import NetWorthClient from "./NetWorthClient";

// No searchParams/cookies/headers here to signal per-request rendering to
// Next, so without this the page gets prerendered once at build time and
// would keep serving that frozen snapshot — including right after a mutation
// (NetWorthClient calls router.refresh() expecting a fresh server render).
export const dynamic = "force-dynamic";

export default async function NetWorthPage() {
  const rows = await prisma.netWorthSnapshot.findMany({
    orderBy: [{ year: "asc" }, { month: "asc" }],
  });

  const snapshots = rows.map((s) => {
    const cash = Number(s.cash);
    const savings = Number(s.savings);
    const investments = Number(s.investments);
    const property = Number(s.property);
    const debt = Number(s.debt);
    return {
      id: s.id,
      month: s.month,
      year: s.year,
      cash,
      savings,
      investments,
      property,
      debt,
      total: cash + savings + investments + property - debt,
      notes: s.notes,
    };
  });

  return <NetWorthClient snapshots={snapshots} />;
}
