import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import * as fs from "fs";

const prisma = new PrismaClient({
  adapter: new PrismaPg(process.env.DATABASE_URL!),
});

const CSV_PATH = process.argv[2];
if (!CSV_PATH) {
  console.error("Usage: npx tsx scripts/import-bank.ts <path-to-csv>");
  process.exit(1);
}

// Bank subcategory → [group, category]
const MAPPING: Record<string, [string, string]> = {
  // Incomes
  "Incomes > Salaries": ["INCOME", "SALARY"],
  "Incomes > Other incomes": ["INCOME", "OTHER_INCOME"],
  "Incomes > Refunds": ["INCOME", "OTHER_INCOME"],

  // Food & Dining
  "Food & Dining > Supermarkets / Groceries": ["VARIABLE_EXPENSE", "GROCERIES"],
  "Food & Dining > Restaurants": ["VARIABLE_EXPENSE", "RESTAURANTS"],
  "Food & Dining > Food - Others": ["VARIABLE_EXPENSE", "GROCERIES"],
  "Food & Dining > Coffee shop": ["VARIABLE_EXPENSE", "RESTAURANTS"],
  "Food & Dining > Fast foods": ["VARIABLE_EXPENSE", "RESTAURANTS"],

  // Auto & Transport
  "Auto & Transport > Public transportation": ["FIXED_EXPENSE", "TRANSPORT_FIXED"],
  "Auto & Transport > Parking": ["VARIABLE_EXPENSE", "TRANSPORT_VARIABLE"],
  "Auto & Transport > Auto & Transport - Others": ["VARIABLE_EXPENSE", "TRANSPORT_VARIABLE"],
  "Auto & Transport > Train ticket": ["VARIABLE_EXPENSE", "TRANSPORT_VARIABLE"],
  "Auto & Transport > Auto insurance": ["FIXED_EXPENSE", "INSURANCE"],
  "Auto & Transport > Gas & Fuel": ["VARIABLE_EXPENSE", "TRANSPORT_VARIABLE"],
  "Auto & Transport > Tolls": ["VARIABLE_EXPENSE", "TRANSPORT_VARIABLE"],

  // Entertainment
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

  // Bills & Utilities
  "Bills & Utilities > Subscription - Others": ["FIXED_EXPENSE", "SUBSCRIPTIONS"],
  "Bills & Utilities > Cable TV": ["FIXED_EXPENSE", "SUBSCRIPTIONS"],
  "Bills & Utilities > Internet": ["FIXED_EXPENSE", "INTERNET_PHONE"],

  // Home
  "Home > Electricity": ["FIXED_EXPENSE", "UTILITIES"],
  "Home > Home insurance": ["FIXED_EXPENSE", "INSURANCE"],

  // Health
  "Health > Health insurance": ["FIXED_EXPENSE", "INSURANCE"],
  "Health > Health - Others": ["UNEXPECTED", "HEALTH"],
  "Health > Doctor": ["UNEXPECTED", "HEALTH"],
  "Health > Pharmacy": ["VARIABLE_EXPENSE", "PHARMACY"],

  // Shopping
  "Shopping > Shopping - Others": ["VARIABLE_EXPENSE", "CLOTHING"],
  "Shopping > Gifts": ["VARIABLE_EXPENSE", "GIFTS"],
  "Shopping > Clothing & Shoes": ["VARIABLE_EXPENSE", "CLOTHING"],

  // Bank
  "Bank > Mortgage refund": ["DEBT", "INSTALLMENT"],
  "Bank > Banking fees and charges": ["FIXED_EXPENSE", "CREDIT_PAYMENT"],
  "Bank > Savings": ["SAVINGS", "GENERAL_SAVINGS"],

  // Misc
  "Misc. expenses > Uncategorized": ["UNEXPECTED", "UNPLANNED"],
  "Misc. expenses > Insurance": ["FIXED_EXPENSE", "INSURANCE"],
  "Misc. expenses > to investigate": ["UNEXPECTED", "UNPLANNED"],
  "Misc. expenses > Others spending": ["UNEXPECTED", "UNPLANNED"],
  "Misc. expenses > Charity": ["VARIABLE_EXPENSE", "GIFTS"],

  // Withdrawals
  "Withdrawals, checks & transfer > Transfer": ["SAVINGS", "GENERAL_SAVINGS"],
  "Withdrawals, checks & transfer > Internal transfer": ["SAVINGS", "GENERAL_SAVINGS"],

  // Personal care
  "Personal care > Personal care - Others": ["VARIABLE_EXPENSE", "PERSONAL_CARE"],
  "Personal care > Hairdresser": ["VARIABLE_EXPENSE", "PERSONAL_CARE"],

  // Taxes
  "Taxes > Taxes": ["DEBT", "PENDING_PAYMENT"],

  // Business services
  "Business services > Online services": ["FIXED_EXPENSE", "SUBSCRIPTIONS"],

  // Education
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

function parseDate(dateStr: string): Date {
  const [day, month, year] = dateStr.split("/");
  return new Date(Number(year), Number(month) - 1, Number(day));
}

async function main() {
  const content = fs.readFileSync(CSV_PATH, "utf-8");
  const rows = parseCSV(content);
  console.log(`Parsed ${rows.length} rows from CSV`);

  // Delete existing migrated data (from old tables) to replace with real bank data
  const deleted = await prisma.personalTransaction.deleteMany({});
  console.log(`Cleared ${deleted.count} old transactions`);

  let imported = 0;
  let skipped = 0;

  for (const row of rows) {
    const cat = (row["Catégorie"] || "").trim();
    const sub = (row["Sous-Catégorie"] || "").trim();
    const amount = parseFloat((row["Montant"] || "0").replace(",", "."));
    const description = (row["Description"] || "").trim();
    const account = (row["Compte"] || "").trim();
    const dateStr = (row["Date"] || "").trim();

    if (!dateStr || isNaN(amount)) {
      skipped++;
      continue;
    }

    // Skip internal transfers (they're not real income/expenses)
    if (cat === "Withdrawals, checks & transfer" && sub === "Internal transfer") {
      skipped++;
      continue;
    }

    const key = `${cat} > ${sub}`;
    const mapping = MAPPING[key] || CATEGORY_FALLBACK[cat];

    if (!mapping) {
      console.log(`  UNMAPPED: ${key} — ${description} (${amount})`);
      skipped++;
      continue;
    }

    let [group, category] = mapping;

    // Override group for negative amounts in income categories
    if (amount < 0 && group === "INCOME") {
      group = "VARIABLE_EXPENSE";
      category = "GROCERIES";
    }

    // For positive amounts in expense categories, treat as income refund
    if (amount > 0 && group !== "INCOME" && group !== "SAVINGS") {
      group = "INCOME";
      category = "OTHER_INCOME";
    }

    const absAmount = Math.abs(amount);

    await prisma.personalTransaction.create({
      data: {
        date: parseDate(dateStr),
        amount: absAmount,
        group: group as any,
        category: category as any,
        description,
        notes: `${account} | ${cat} > ${sub}`,
      },
    });
    imported++;
  }

  console.log(`\nDone: ${imported} imported, ${skipped} skipped`);

  // Summary
  const byMonth = await prisma.$queryRawUnsafe(`
    SELECT
      EXTRACT(YEAR FROM date)::int as year,
      EXTRACT(MONTH FROM date)::int as month,
      "group",
      COUNT(*)::int as count,
      SUM(amount)::numeric as total
    FROM personal_transactions
    GROUP BY year, month, "group"
    ORDER BY year, month, "group"
  `) as any[];

  console.log("\n=== RESUMEN POR MES ===");
  let currentMonth = "";
  for (const r of byMonth) {
    const key = `${r.year}-${String(r.month).padStart(2, "0")}`;
    if (key !== currentMonth) {
      currentMonth = key;
      console.log(`\n${key}:`);
    }
    console.log(`  ${r.group}: ${r.count} txns, ${Number(r.total).toFixed(0)}`);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
