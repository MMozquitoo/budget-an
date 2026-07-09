import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import * as fs from "fs";

const prisma = new PrismaClient({
  adapter: new PrismaPg(process.env.DATABASE_URL!),
});

const CSV_PATH = process.argv[2];
const APPLY = process.argv.includes("--apply");
if (!CSV_PATH) {
  console.error("Usage: npx tsx scripts/import-bank.ts <path-to-csv> [--apply]");
  console.error("Without --apply it is a DRY RUN (nothing is written).");
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

async function main() {
  const content = fs.readFileSync(CSV_PATH, "utf-8");
  const rows = parseCSV(content);
  console.log(`Parsed ${rows.length} rows from CSV`);

  const data: {
    date: Date; amount: number; group: string; category: string;
    description: string; notes: string;
  }[] = [];
  let skippedTransfer = 0;
  let skippedInvalid = 0;
  let skippedUnmapped = 0;

  for (const row of rows) {
    const cat = (row["Catégorie"] || "").trim();
    const sub = (row["Sous-Catégorie"] || "").trim();
    const amount = parseFloat((row["Montant"] || "0").replace(",", "."));
    const description = (row["Description"] || "").trim();
    const account = (row["Compte"] || "").trim();
    const dateStr = (row["Date"] || "").trim();

    if (!dateStr || isNaN(amount)) { skippedInvalid++; continue; }
    if (isInternalTransfer(sub, description)) { skippedTransfer++; continue; }

    const key = `${cat} > ${sub}`;
    const mapping = MAPPING[key] || CATEGORY_FALLBACK[cat];
    if (!mapping) {
      console.log(`  UNMAPPED: ${key} — ${description} (${amount})`);
      skippedUnmapped++;
      continue;
    }

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
      notes: `${account} | ${cat} > ${sub}`,
    });
  }

  console.log(
    `\nPrepared ${data.length} rows | skipped: ${skippedTransfer} internal transfers, ` +
    `${skippedInvalid} invalid, ${skippedUnmapped} unmapped`
  );

  if (!APPLY) {
    console.log("\nDRY RUN — re-run with --apply to replace the table. Nothing changed.");
    return;
  }

  const existing = await prisma.personalTransaction.count();
  console.log(`\nReplacing ${existing} existing rows atomically…`);
  const [del, ins] = await prisma.$transaction([
    prisma.personalTransaction.deleteMany({}),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    prisma.personalTransaction.createMany({ data: data as any }),
  ]);
  console.log(`Deleted ${del.count}, inserted ${ins.count}. Table now has ${await prisma.personalTransaction.count()} rows.`);
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(async () => { await prisma.$disconnect().catch(() => {}); });
