import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import * as fs from "fs";
import {
  parseCSV,
  prepareRows,
  dedupe,
  csvDateRange,
  type PreparedRow,
} from "../src/lib/import.js";
import { getTaxonomy } from "../src/lib/taxonomy.js";

const prisma = new PrismaClient({
  adapter: new PrismaPg(process.env.DATABASE_URL!),
});

const CSV_PATH = process.argv[2];
const APPLY = process.argv.includes("--apply");
const REPLACE = process.argv.includes("--replace");
const FORCE = process.argv.includes("--force");
const NO_RULES = process.argv.includes("--no-rules");

if (!CSV_PATH) {
  console.error("Usage: npx tsx scripts/import-bank.ts <path-to-csv> [--apply] [--no-rules]");
  console.error("");
  console.error("  (no flag)   DRY RUN — shows what would change, writes nothing");
  console.error("  --apply     insert the rows that are not already in the database");
  console.error("  --no-rules  ignore ClassificationRule, use only the built-in mapping");
  console.error("  --replace   DESTRUCTIVE: wipe the table first (needs --force too)");
  console.error("");
  console.error("The import is incremental by default: existing rows — including any");
  console.error("manual reclassification, split or note — are never touched.");
  console.error("");
  console.error("The mapping/dedup logic lives in src/lib/import.ts, shared with the");
  console.error("web import (/import).");
  process.exit(1);
}

if (REPLACE && !FORCE) {
  console.error(
    "--replace deletes every personal transaction, losing all manual\n" +
    "reclassifications, splits and notes. Re-run with --force if that is\n" +
    "really what you want."
  );
  process.exit(1);
}

// Drop the display-only ruleName before writing.
function forDb(r: PreparedRow) {
  const { ruleName: _ruleName, ...row } = r;
  return row;
}

async function main() {
  const content = fs.readFileSync(CSV_PATH, "utf-8");
  const rows = parseCSV(content);
  console.log(`Parsed ${rows.length} rows from CSV`);

  const rules = NO_RULES
    ? []
    : await prisma.classificationRule.findMany({
        where: { active: true },
        orderBy: { priority: "desc" },
      });
  if (rules.length > 0) console.log(`Loaded ${rules.length} active classification rules`);

  const taxonomy = await getTaxonomy();
  const { prepared, skippedTransfer, skippedInvalid, skippedUnmapped, byRule, unmapped } =
    prepareRows(rows, rules, taxonomy.categoriesByGroup);
  for (const u of unmapped) console.log(`  UNMAPPED: ${u.key} — ${u.description} (${u.amount})`);
  console.log(
    `\nPrepared ${prepared.length} rows (${byRule} classified by a rule) | skipped: ` +
    `${skippedTransfer} internal transfers, ${skippedInvalid} invalid, ${skippedUnmapped} unmapped`
  );

  if (prepared.length === 0) {
    console.log("Nothing to import.");
    return;
  }

  if (REPLACE) {
    if (!APPLY) {
      console.log("\nDRY RUN (--replace) — would delete every row and insert these. Nothing changed.");
      return;
    }
    const existing = await prisma.personalTransaction.count();
    console.log(`\nReplacing ${existing} existing rows atomically…`);
    const [del, ins] = await prisma.$transaction([
      prisma.personalTransaction.deleteMany({}),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      prisma.personalTransaction.createMany({ data: prepared.map(forDb) as any }),
    ]);
    console.log(`Deleted ${del.count}, inserted ${ins.count}.`);
    return;
  }

  // ── Incremental path (the default) ──
  const range = csvDateRange(prepared)!;
  const existing = await prisma.personalTransaction.findMany({
    where: { date: { gte: range.from, lte: range.to }, parentId: null },
    select: { date: true, amount: true, description: true },
  });
  const { toInsert, alreadyPresent } = dedupe(
    prepared,
    existing.map((e) => ({ date: e.date, amount: Number(e.amount), description: e.description }))
  );

  console.log(
    `\nRange ${range.from.toISOString().slice(0, 10)} → ${range.to.toISOString().slice(0, 10)}: ` +
    `${existing.length} rows already stored, ${alreadyPresent} of the CSV rows match them.`
  );
  console.log(`${toInsert.length} new rows to insert.`);

  for (const d of toInsert.slice(0, 10)) {
    console.log(
      `  + ${d.date.toISOString().slice(0, 10)} ${d.amount.toFixed(2).padStart(9)} ` +
      `${d.group}/${d.category} — ${d.description.slice(0, 50)}` +
      (d.ruleName ? `  [règle: ${d.ruleName}]` : "")
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
    data: toInsert.map(forDb) as any,
  });
  console.log(
    `\nInserted ${ins.count} rows. Table now has ` +
    `${await prisma.personalTransaction.count()} rows. Nothing was deleted.`
  );
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(async () => { await prisma.$disconnect().catch(() => {}); });
