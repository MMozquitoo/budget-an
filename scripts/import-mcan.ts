import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import * as fs from "fs";
import { dedupe, csvDateRange } from "../src/lib/import.js";
import { parseQontoCSV, prepareQontoRows } from "../src/lib/qonto-import.js";

const prisma = new PrismaClient({
  adapter: new PrismaPg(process.env.DATABASE_URL!),
});

const CSV_PATH = process.argv[2];
const APPLY = process.argv.includes("--apply");

if (!CSV_PATH) {
  console.error("Usage: npx tsx scripts/import-mcan.ts <path-to-qonto-csv> [--apply]");
  console.error("");
  console.error("  (no flag)   DRY RUN — shows what would be inserted, writes nothing");
  console.error("  --apply     insert the rows that are not already in the database");
  console.error("");
  console.error("Imports MCAN's Qonto export as group BUSINESS (category BUSINESS_INCOME/");
  console.error("BUSINESS_EXPENSE by sign), 2026 onward, settled (\"Exécuté\") rows only.");
  console.error("Incremental and non-destructive, same fingerprint-dedup discipline as");
  console.error("scripts/import-bank.ts — never touches existing rows.");
  process.exit(1);
}

async function main() {
  const content = fs.readFileSync(CSV_PATH, "utf-8");
  const rows = parseQontoCSV(content);
  console.log(`Parsed ${rows.length} rows from CSV`);

  const { prepared, skippedPending, skippedInvalid, skippedBeforeYear } = prepareQontoRows(rows);
  console.log(
    `Prepared ${prepared.length} rows | skipped: ${skippedPending} pending ("En cours"), ` +
    `${skippedInvalid} invalid, ${skippedBeforeYear} before 2026`
  );

  if (prepared.length === 0) {
    console.log("Nothing to import.");
    return;
  }

  const range = csvDateRange(prepared)!;
  const existing = await prisma.personalTransaction.findMany({
    where: { group: "BUSINESS", date: { gte: range.from, lte: range.to }, parentId: null },
    select: { date: true, amount: true, description: true },
  });
  const { toInsert, alreadyPresent } = dedupe(
    prepared,
    existing.map((e) => ({ date: e.date, amount: Number(e.amount), description: e.description }))
  );

  console.log(
    `\nRange ${range.from.toISOString().slice(0, 10)} → ${range.to.toISOString().slice(0, 10)}: ` +
    `${existing.length} BUSINESS rows already stored, ${alreadyPresent} of the CSV rows match them.`
  );
  console.log(`${toInsert.length} new rows to insert.`);

  const income = toInsert.filter((d) => d.category === "BUSINESS_INCOME");
  const expense = toInsert.filter((d) => d.category === "BUSINESS_EXPENSE");
  console.log(
    `  ${income.length} income (${income.reduce((s, d) => s + d.amount, 0).toFixed(2)} €), ` +
    `${expense.length} expense (${expense.reduce((s, d) => s + d.amount, 0).toFixed(2)} €)`
  );

  for (const d of toInsert.slice(0, 10)) {
    console.log(
      `  + ${d.date.toISOString().slice(0, 10)} ${d.category === "BUSINESS_INCOME" ? "+" : "-"}` +
      `${d.amount.toFixed(2).padStart(9)} — ${d.description.slice(0, 50)} (${d.notes})`
    );
  }
  if (toInsert.length > 10) console.log(`  … and ${toInsert.length - 10} more`);

  if (!APPLY) {
    console.log("\nDRY RUN — re-run with --apply to insert them. Nothing changed.");
    return;
  }
  if (toInsert.length === 0) {
    console.log("\nNothing new — database already up to date.");
    return;
  }

  const ins = await prisma.personalTransaction.createMany({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: toInsert as any,
  });
  console.log(
    `\nInserted ${ins.count} rows. Table now has ` +
    `${await prisma.personalTransaction.count({ where: { group: "BUSINESS" } })} BUSINESS rows. ` +
    `Nothing was deleted.`
  );
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(async () => { await prisma.$disconnect().catch(() => {}); });
