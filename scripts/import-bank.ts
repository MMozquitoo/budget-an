import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import * as fs from "fs";
import { classify } from "../src/lib/rules.js";

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

// Bank subcategory → [group, category]
const MAPPING: Record<string, [string, string]> = {
  "Incomes > Salaries": ["INCOME", "SALARY"],
  "Incomes > Other incomes": ["INCOME", "OTHER_INCOME"],
  "Incomes > Refunds": ["INCOME", "OTHER_INCOME"],
  "Food & Dining > Supermarkets / Groceries": ["VARIABLE_EXPENSE", "GROCERIES"],
  "Food & Dining > Restaurants": ["VARIABLE_EXPENSE", "RESTAURANTS"],
  "Food & Dining > Food - Others": ["VARIABLE_EXPENSE", "GROCERIES"],
  "Food & Dining > Coffee shop": ["VARIABLE_EXPENSE", "RESTAURANTS"],
  "Food & Dining > Fast foods": ["VARIABLE_EXPENSE", "RESTAURANTS"],
  "Auto & Transport > Public transportation": ["FIXED_EXPENSE", "TRANSPORT_FIXED"],
  "Auto & Transport > Parking": ["VARIABLE_EXPENSE", "TRANSPORT_VARIABLE"],
  "Auto & Transport > Auto & Transport - Others": ["VARIABLE_EXPENSE", "TRANSPORT_VARIABLE"],
  "Auto & Transport > Train ticket": ["VARIABLE_EXPENSE", "TRANSPORT_VARIABLE"],
  "Auto & Transport > Auto insurance": ["FIXED_EXPENSE", "INSURANCE"],
  "Auto & Transport > Gas & Fuel": ["VARIABLE_EXPENSE", "TRANSPORT_VARIABLE"],
  "Auto & Transport > Tolls": ["VARIABLE_EXPENSE", "TRANSPORT_VARIABLE"],
  "Entertainment > Travels / Vacation": ["SAVINGS", "TRAVEL_FUND"],
  "Entertainment > Amusements": ["VARIABLE_EXPENSE", "ENTERTAINMENT"],
  "Entertainment > Bars & Clubs": ["VARIABLE_EXPENSE", "ENTERTAINMENT"],
  "Entertainment > Entertainment - Others": ["VARIABLE_EXPENSE", "ENTERTAINMENT"],
  "Entertainment > Sports": ["VARIABLE_EXPENSE", "ENTERTAINMENT"],
  "Entertainment > Eating out": ["VARIABLE_EXPENSE", "RESTAURANTS"],
  "Entertainment > Arts & Amusement": ["VARIABLE_EXPENSE", "ENTERTAINMENT"],
  "Entertainment > Hotels": ["SAVINGS", "TRAVEL_FUND"],
  "Entertainment > Hobbies": ["VARIABLE_EXPENSE", "ENTERTAINMENT"],
  "Entertainment > Pets": ["VARIABLE_EXPENSE", "PETS"],
  "Bills & Utilities > Subscription - Others": ["FIXED_EXPENSE", "SUBSCRIPTIONS"],
  "Bills & Utilities > Cable TV": ["FIXED_EXPENSE", "SUBSCRIPTIONS"],
  "Bills & Utilities > Internet": ["FIXED_EXPENSE", "INTERNET_PHONE"],
  "Home > Electricity": ["FIXED_EXPENSE", "UTILITIES"],
  "Home > Home insurance": ["FIXED_EXPENSE", "INSURANCE"],
  "Health > Health insurance": ["FIXED_EXPENSE", "INSURANCE"],
  "Health > Health - Others": ["UNEXPECTED", "HEALTH"],
  "Health > Doctor": ["UNEXPECTED", "HEALTH"],
  "Health > Pharmacy": ["VARIABLE_EXPENSE", "PHARMACY"],
  "Shopping > Shopping - Others": ["VARIABLE_EXPENSE", "CLOTHING"],
  "Shopping > Gifts": ["VARIABLE_EXPENSE", "GIFTS"],
  "Shopping > Clothing & Shoes": ["VARIABLE_EXPENSE", "CLOTHING"],
  "Bank > Mortgage refund": ["DEBT", "INSTALLMENT"],
  "Bank > Banking fees and charges": ["FIXED_EXPENSE", "CREDIT_PAYMENT"],
  "Bank > Savings": ["SAVINGS", "GENERAL_SAVINGS"],
  "Misc. expenses > Uncategorized": ["UNEXPECTED", "UNPLANNED"],
  "Misc. expenses > Insurance": ["FIXED_EXPENSE", "INSURANCE"],
  "Misc. expenses > to investigate": ["UNEXPECTED", "UNPLANNED"],
  "Misc. expenses > Others spending": ["UNEXPECTED", "UNPLANNED"],
  "Misc. expenses > Charity": ["VARIABLE_EXPENSE", "GIFTS"],
  "Withdrawals, checks & transfer > Transfer": ["SAVINGS", "GENERAL_SAVINGS"],
  "Withdrawals, checks & transfer > Internal transfer": ["SAVINGS", "GENERAL_SAVINGS"],
  "Personal care > Personal care - Others": ["VARIABLE_EXPENSE", "PERSONAL_CARE"],
  "Personal care > Hairdresser": ["VARIABLE_EXPENSE", "PERSONAL_CARE"],
  "Taxes > Taxes": ["DEBT", "PENDING_PAYMENT"],
  "Business services > Online services": ["FIXED_EXPENSE", "SUBSCRIPTIONS"],
  "Education & Children > Education & Children - Others": ["FIXED_EXPENSE", "EDUCATION_FIXED"],
};

// Fallback by main category
const CATEGORY_FALLBACK: Record<string, [string, string]> = {
  "Incomes": ["INCOME", "OTHER_INCOME"],
  "Food & Dining": ["VARIABLE_EXPENSE", "GROCERIES"],
  "Auto & Transport": ["VARIABLE_EXPENSE", "TRANSPORT_VARIABLE"],
  "Entertainment": ["VARIABLE_EXPENSE", "ENTERTAINMENT"],
  "Bills & Utilities": ["FIXED_EXPENSE", "SUBSCRIPTIONS"],
  "Home": ["FIXED_EXPENSE", "RENT"],
  "Health": ["UNEXPECTED", "HEALTH"],
  "Shopping": ["VARIABLE_EXPENSE", "CLOTHING"],
  "Bank": ["DEBT", "CREDIT_CARD"],
  "Misc. expenses": ["UNEXPECTED", "UNPLANNED"],
  "Withdrawals, checks & transfer": ["SAVINGS", "GENERAL_SAVINGS"],
  "Personal care": ["VARIABLE_EXPENSE", "PERSONAL_CARE"],
  "Taxes": ["DEBT", "PENDING_PAYMENT"],
  "Business services": ["FIXED_EXPENSE", "SUBSCRIPTIONS"],
  "Education & Children": ["FIXED_EXPENSE", "EDUCATION_FIXED"],
};

// Internal transfers between Adrien's own / the couple's accounts are not real
// income or expense — discard them. Identified by the bank's own "Internal
// transfer" subcategory, the couple's joint "Naeem Ou Rodriguez" label, or
// Adrien as the SENDER of a transfer ("De: Adrien Naeem" / "…Sent From Revolut").
// The colon is required so external payments that merely name Adrien as the payer
// (e.g. "Flatlooker Virement De Adrien Naeem" = rent) are kept.
function isInternalTransfer(sub: string, desc: string): boolean {
  if (sub === "Internal transfer") return true;
  const d = desc.toLowerCase();
  if (d.includes("naeem ou rodriguez")) return true;
  if (/\bde\s*:\s*(m\.?|mr\.?|mme\.?)?\s*adrien\s+(imran\s+)?naeem/.test(d)) return true;
  if (d.includes("adrien naeem sent from")) return true;
  return false;
}

function parseCSV(content: string): Record<string, string>[] {
  const lines = content.split("\n").filter((l) => l.trim());
  const headers = lines[0].split(";").map((h) => h.trim().replace(/"/g, ""));
  return lines.slice(1).map((line) => {
    const values = line.split(";").map((v) => v.trim().replace(/^"|"$/g, ""));
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = values[i] || "";
    });
    return row;
  });
}

// Store at UTC noon so the date's calendar day is identical in every timezone
// (robust against the import machine / server timezone; the personal-transaction
// routes filter by UTC month boundaries).
function parseDate(dateStr: string): Date {
  const [day, month, year] = dateStr.split("/");
  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), 12, 0, 0));
}

/**
 * Identity of a transaction as the bank reports it. Two rows with the same day,
 * amount and payee are the same transaction — that is what lets the import run
 * again over an overlapping export without creating duplicates.
 */
function fingerprint(date: Date, amount: number, description: string): string {
  return [
    date.toISOString().slice(0, 10),
    amount.toFixed(2),
    description.toLowerCase().replace(/\s+/g, " ").trim(),
  ].join("|");
}

interface PreparedRow {
  date: Date;
  amount: number;
  group: string;
  category: string;
  description: string;
  notes: string;
  ruleName?: string;
}

async function main() {
  const content = fs.readFileSync(CSV_PATH, "utf-8");
  const rows = parseCSV(content);
  console.log(`Parsed ${rows.length} rows from CSV`);

  // User-defined rules win over the built-in mapping: they are the whole point
  // of the Règles page, and they encode knowledge the bank's own categories miss.
  const rules = NO_RULES
    ? []
    : await prisma.classificationRule.findMany({
        where: { active: true },
        orderBy: { priority: "desc" },
      });
  if (rules.length > 0) console.log(`Loaded ${rules.length} active classification rules`);

  const data: PreparedRow[] = [];
  let skippedTransfer = 0;
  let skippedInvalid = 0;
  let skippedUnmapped = 0;
  let byRule = 0;

  for (const row of rows) {
    const cat = (row["Catégorie"] || "").trim();
    const sub = (row["Sous-Catégorie"] || "").trim();
    const amount = parseFloat((row["Montant"] || "0").replace(",", "."));
    const description = (row["Description"] || "").trim();
    const account = (row["Compte"] || "").trim();
    const dateStr = (row["Date"] || "").trim();

    if (!dateStr || isNaN(amount)) { skippedInvalid++; continue; }
    if (isInternalTransfer(sub, description)) { skippedTransfer++; continue; }

    const notes = `${account} | ${cat} > ${sub}`;
    const key = `${cat} > ${sub}`;

    const matched = classify(rules, { description, notes });
    const mapping = matched
      ? ([matched.group, matched.category] as [string, string])
      : MAPPING[key] || CATEGORY_FALLBACK[cat];

    if (!mapping) {
      console.log(`  UNMAPPED: ${key} — ${description} (${amount})`);
      skippedUnmapped++;
      continue;
    }
    if (matched) byRule++;

    let [group, category] = mapping;
    // Sign decides direction; keep the bank category for the nature.
    if (amount > 0 && group !== "INCOME" && group !== "SAVINGS") {
      // money in on an expense category = a refund
      group = "INCOME"; category = "OTHER_INCOME";
    }
    if (amount < 0 && group === "INCOME") {
      // money out on an income category = a reversal, not a grocery run
      group = "UNEXPECTED"; category = "UNPLANNED";
    }

    data.push({
      date: parseDate(dateStr),
      amount: Math.abs(amount),
      group,
      category,
      description,
      notes,
      ruleName: matched?.ruleName,
    });
  }

  console.log(
    `\nPrepared ${data.length} rows (${byRule} classified by a rule) | skipped: ` +
    `${skippedTransfer} internal transfers, ${skippedInvalid} invalid, ${skippedUnmapped} unmapped`
  );

  if (data.length === 0) {
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
      prisma.personalTransaction.createMany({ data: data as any }),
    ]);
    console.log(`Deleted ${del.count}, inserted ${ins.count}.`);
    return;
  }

  // ── Incremental path (the default) ──
  // Compare against what is already stored over the CSV's own date range only,
  // so re-importing an overlapping export is a no-op instead of a duplication.
  const dates = data.map((d) => d.date.getTime());
  const from = new Date(Math.min(...dates));
  const to = new Date(Math.max(...dates) + 24 * 60 * 60 * 1000);

  const existing = await prisma.personalTransaction.findMany({
    where: { date: { gte: from, lte: to }, parentId: null },
    select: { date: true, amount: true, description: true },
  });

  const existingCounts = new Map<string, number>();
  for (const e of existing) {
    const fp = fingerprint(e.date, Number(e.amount), e.description);
    existingCounts.set(fp, (existingCounts.get(fp) || 0) + 1);
  }

  // Group the CSV by fingerprint and keep the surplus: two identical coffees on
  // the same day are two real transactions, so dedup by count, not by presence.
  const csvGroups = new Map<string, PreparedRow[]>();
  for (const d of data) {
    const fp = fingerprint(d.date, d.amount, d.description);
    const bucket = csvGroups.get(fp);
    if (bucket) bucket.push(d);
    else csvGroups.set(fp, [d]);
  }

  const toInsert: PreparedRow[] = [];
  let alreadyPresent = 0;
  for (const [fp, group] of csvGroups) {
    const have = existingCounts.get(fp) || 0;
    alreadyPresent += Math.min(have, group.length);
    toInsert.push(...group.slice(have));
  }

  console.log(
    `\nRange ${from.toISOString().slice(0, 10)} → ${to.toISOString().slice(0, 10)}: ` +
    `${existing.length} rows already stored, ${alreadyPresent} of the CSV rows match them.`
  );
  console.log(`${toInsert.length} new rows to insert.`);

  if (toInsert.length > 0) {
    const preview = toInsert.slice(0, 10);
    for (const d of preview) {
      console.log(
        `  + ${d.date.toISOString().slice(0, 10)} ${d.amount.toFixed(2).padStart(9)} ` +
        `${d.group}/${d.category} — ${d.description.slice(0, 50)}` +
        (d.ruleName ? `  [règle: ${d.ruleName}]` : "")
      );
    }
    if (toInsert.length > preview.length) {
      console.log(`  … and ${toInsert.length - preview.length} more`);
    }
  }

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
    data: toInsert.map(({ ruleName: _ruleName, ...row }) => row) as any,
  });
  console.log(
    `\nInserted ${ins.count} rows. Table now has ` +
    `${await prisma.personalTransaction.count()} rows. Nothing was deleted.`
  );
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(async () => { await prisma.$disconnect().catch(() => {}); });
