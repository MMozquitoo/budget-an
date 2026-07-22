import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";

/**
 * Run a backup right now, to a local file — the manual counterpart to the daily
 * cron. Use it before anything that rewrites data in bulk (a rule replay, a
 * migration, a --replace import).
 *
 * Writes to _data/backups/, which is gitignored: this file is the whole
 * financial history in clear text and must never reach the repository, which
 * is public.
 */

const prisma = new PrismaClient({
  adapter: new PrismaPg(process.env.DATABASE_URL!),
});

const OUT_DIR = process.argv[2] || "_data/backups";

async function main() {
  const now = new Date();

  const tables = {
    personalTransactions: await prisma.personalTransaction.findMany({ orderBy: { date: "asc" } }),
    classificationRules: await prisma.classificationRule.findMany(),
    netWorthSnapshots: await prisma.netWorthSnapshot.findMany(),
    householdExpenses: await prisma.householdExpense.findMany(),
    personalIncome: await prisma.personalIncome.findMany(),
    businessLines: await prisma.businessLine.findMany(),
    revenues: await prisma.revenue.findMany(),
    businessExpenses: await prisma.businessExpense.findMany(),
    events: await prisma.event.findMany(),
    pipelineOpportunities: await prisma.pipelineOpportunity.findMany(),
    wealthSnapshots: await prisma.wealthSnapshot.findMany(),
    timeEntries: await prisma.timeEntry.findMany(),
    decisions: await prisma.decision.findMany(),
  };

  const counts = Object.fromEntries(
    Object.entries(tables).map(([name, rows]) => [name, rows.length])
  );

  if (counts.personalTransactions === 0) {
    throw new Error(
      "Zero personal transactions — refusing to write a backup that is probably a failed read"
    );
  }

  const backup = { version: 1, createdAt: now.toISOString(), counts, tables };
  const stamp = now.toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const file = path.join(OUT_DIR, `backup-${stamp}.json`);

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(file, JSON.stringify(backup, null, 2));

  const size = (fs.statSync(file).size / 1024 / 1024).toFixed(2);
  console.log(`Wrote ${file} (${size} MB)`);
  for (const [name, count] of Object.entries(counts)) {
    if (count > 0) console.log(`  ${String(count).padStart(6)}  ${name}`);
  }
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(async () => { await prisma.$disconnect().catch(() => {}); });
