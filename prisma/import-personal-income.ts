import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL!;
const prisma = new PrismaClient({ adapter: new PrismaPg(connectionString) });

// Personal income data extracted from the Monthly History Sheet
// Pole Emploi stopped in September 2025
const PERSONAL_INCOME = [
  // { month, year, poleEmploi, salaireCR }
  { month: 1, year: 2025, pe: 3808, sc: 2010 },
  { month: 2, year: 2025, pe: 3439, sc: 2175 },
  { month: 3, year: 2025, pe: 4163, sc: 2305 },
  { month: 4, year: 2025, pe: 3685, sc: 2211 },
  { month: 5, year: 2025, pe: 3685, sc: 2100 },
  { month: 6, year: 2025, pe: 3685, sc: 2100 },
  { month: 7, year: 2025, pe: 3703, sc: 2211 },
  { month: 8, year: 2025, pe: 2715, sc: 2211 },
  { month: 9, year: 2025, pe: 0, sc: 2211 },     // PE stopped
  { month: 10, year: 2025, pe: 0, sc: 2339 },    // PE stopped
  // Nov: no data
  { month: 12, year: 2025, pe: 3900, sc: 2100 }, // Dec from Sheet
];

// Real estate: exclude LCL apartment from equity
// Original: investments=320,750 debt=304,200 → equity=16,550
// Fix: remove LCL 102k debt → investments=320,750 debt=202,200 → equity=118,550
// But also: LCL apartment HAS a value (it's a real property), we just don't know it.
// Cleanest: keep SDC Abondant + SCPI + Serepierre as investments, keep their debts,
// and exclude LCL entirely (both sides unknown for asset value).
const INVESTMENTS_EXCL_LCL = 260000 + 56000 + 4750; // 320,750
const DEBT_EXCL_LCL = 95000 + 76000 + 31200;        // 202,200
// Net equity excl LCL = 118,550

async function main() {
  console.log("Importing personal income from Monthly History Sheet...\n");

  // Clear existing personal income
  await prisma.personalIncome.deleteMany({});

  let count = 0;
  for (const row of PERSONAL_INCOME) {
    const date = new Date(row.year, row.month - 1, 15);

    if (row.pe > 0) {
      await prisma.personalIncome.create({
        data: {
          date,
          amount: row.pe,
          source: "Pole Emploi",
          description: row.month >= 9 ? null : undefined,
        },
      });
      count++;
    }

    if (row.sc > 0) {
      await prisma.personalIncome.create({
        data: {
          date,
          amount: row.sc,
          source: "Salaire CR (Icon Clinical Research)",
        },
      });
      count++;
    }
  }

  console.log(`  Personal income: ${count} entries imported`);

  // Fix WealthSnapshot: exclude LCL from equity
  console.log("\nFixing WealthSnapshot — excluding LCL apartment...");
  const updated = await prisma.wealthSnapshot.updateMany({
    data: {
      investments: INVESTMENTS_EXCL_LCL,
      debt: DEBT_EXCL_LCL,
    },
  });
  console.log(`  Updated ${updated.count} snapshots: investments=${INVESTMENTS_EXCL_LCL.toLocaleString()}€, debt=${DEBT_EXCL_LCL.toLocaleString()}€`);
  console.log(`  Equity immobilier (excl LCL): ${(INVESTMENTS_EXCL_LCL - DEBT_EXCL_LCL).toLocaleString()}€`);

  // Summary
  const piCount = await prisma.personalIncome.count();
  const piTotal = await prisma.personalIncome.aggregate({ _sum: { amount: true } });
  console.log(`\n  Total personal income in system: ${piCount} entries, ${Number(piTotal._sum.amount).toLocaleString()}€`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
