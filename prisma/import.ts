import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as fs from "fs";
import * as path from "path";

const connectionString = process.env.DATABASE_URL!;
const prisma = new PrismaClient({ adapter: new PrismaPg(connectionString) });

const CSV_DIR = "/Users/cristian/Downloads/BUDGET";

// ─── Amount parsing ───────────────────────────────────────────
function parseAmount(raw: string): number | null {
  if (!raw || raw.trim() === "") return null;
  let s = raw.trim().replace(/\s/g, "").replace("€", "").replace("€", "").trim();
  if (s === "" || s === "0") return 0;
  // Handle both comma and period decimals
  // If there's a comma followed by exactly 2 digits at end, it's decimal
  if (/,\d{2}$/.test(s)) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (/,\d{1}$/.test(s)) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else {
    // No comma decimal — remove commas that might be thousands
    s = s.replace(/,/g, "");
  }
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

// ─── CSV parsing ──────────────────────────────────────────────
function parseCSV(filePath: string): Record<string, string>[] {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n").filter((l) => l.trim());
  if (lines.length < 2) return [];

  const headerLine = lines[0];
  const headers = parseCSVLine(headerLine);

  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((h, j) => {
      row[h.trim()] = (values[j] || "").trim();
    });
    rows.push(row);
  }
  return rows;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

// ─── Date parsing ─────────────────────────────────────────────
function parseDate(raw: string): Date | null {
  if (!raw) return null;
  // DD/MM/YYYY format
  const parts = raw.trim().split("/");
  if (parts.length === 3) {
    const d = parseInt(parts[0]);
    const m = parseInt(parts[1]) - 1;
    const y = parseInt(parts[2]);
    return new Date(y, m, d);
  }
  return null;
}

// ─── Account classification ───────────────────────────────────
const PERSONAL_ACCOUNTS = [
  "Boursorama",
  "N26",
  "SG",
  "Revolut",
  "LCL",
  "Livret A",
  "Compte Bancaire",
  "Compte Courant Prive EUR M Adrien Naeem",
];

const BUSINESS_ACCOUNTS = [
  "Make Commerce AN Group - Compte Principal",
];

const TVA_ACCOUNTS = [
  "Make Commerce AN Group - TVA & Malik",
];

function isPersonalAccount(compte: string): boolean {
  return PERSONAL_ACCOUNTS.some((a) => compte.includes(a));
}

function isBusinessAccount(compte: string): boolean {
  return BUSINESS_ACCOUNTS.some((a) => compte.includes(a));
}

function isTVAAccount(compte: string): boolean {
  return TVA_ACCOUNTS.some((a) => compte.includes(a));
}

// ─── Category mapping ─────────────────────────────────────────
function mapHouseholdCategory(
  cat: string,
  subCat: string,
  desc: string
): "FIXED" | "VARIABLE" | "FAMILY_TRAVEL" | "NICOLAS" {
  const c = cat.toLowerCase();
  const sc = subCat.toLowerCase();
  const d = desc.toLowerCase();

  // Nicolas
  if (c.includes("education") || sc.includes("toys") || d.includes("pandacraft") || d.includes("nicolas") || d.includes("pixli") || d.includes("swizy")) {
    return "NICOLAS";
  }

  // Family travel
  if (sc.includes("travel") || sc.includes("vacation") || sc.includes("hotel") || sc.includes("plane") || sc.includes("airbnb")) {
    return "FAMILY_TRAVEL";
  }

  // Fixed
  if (
    sc.includes("rent") || sc.includes("electricity") || sc.includes("home insurance") ||
    sc.includes("health insurance") || sc.includes("mortgage") || sc.includes("savings") ||
    (sc.includes("public transportation") && d.includes("navigo")) ||
    c.includes("home") || sc.includes("mobile phone") ||
    sc.includes("insurance") || d.includes("aon") || d.includes("mutuelle") ||
    d.includes("loyer") || d.includes("flatlooker") || d.includes("edf") ||
    d.includes("luko") || d.includes("navigo")
  ) {
    return "FIXED";
  }

  return "VARIABLE";
}

function isTransfer(cat: string, subCat: string, desc?: string): boolean {
  const c = cat.toLowerCase();
  const sc = subCat.toLowerCase();

  if (
    c.includes("withdrawal") || c.includes("transfer") ||
    sc.includes("transfer") || sc.includes("internal") ||
    sc.includes("check") || sc.includes("withdrawal")
  ) return true;

  if (desc) {
    const d = desc.toLowerCase();
    const transferPatterns = [
      "sent from", "to adrien", "to cristian", "binance",
      "naeem isf", "ahmed naeem", "internal transfer", "envoie",
      "el fath riad", "laetitia naeem", "kelia falck",
      "pgnig", "food makers", "carulla express",
      "adrien naeem sg", "adrien naeem revolut",
      "adrien naeem cic", "adrien naeem boursorama",
      "adrien naeem (boursorama)",
    ];
    if (transferPatterns.some((p) => d.includes(p))) return true;
  }

  return false;
}

function isIncome(cat: string): boolean {
  return cat.toLowerCase().includes("income");
}

// ─── Business line detection ──────────────────────────────────
const LINE_IDS = {
  gtm: "gtm-advisory",
  events: "events",
  media: "media",
  community: "community",
  speaking: "speaking",
  partnerships: "partnerships",
};

function detectBusinessLine(desc: string, cat: string, subCat: string): string {
  const d = desc.toLowerCase();
  const sc = subCat.toLowerCase();

  if (d.includes("street kred") || d.includes("newson")) return LINE_IDS.gtm;
  if (d.includes("orange") || d.includes("youtube") || d.includes("google") || d.includes("wix") || d.includes("amazon prime")) return LINE_IDS.media;
  if (sc.includes("subscription")) return LINE_IDS.media;
  if (d.includes("store tour") || d.includes("wire")) return LINE_IDS.events;

  return LINE_IDS.gtm; // default
}

// ─── Import Bankin CSVs ───────────────────────────────────────
async function importBankinCSV(filename: string) {
  const filePath = path.join(CSV_DIR, filename);
  const rows = parseCSV(filePath);
  let household = 0, revenue = 0, bizExp = 0, skipped = 0;

  for (const row of rows) {
    const date = parseDate(row["Date"]);
    if (!date) { skipped++; continue; }

    const rawAmount = row["Montant"];
    const amount = parseAmount(rawAmount);
    if (amount === null || amount === 0) { skipped++; continue; }

    const compte = row["Compte"] || "";
    const cat = row["Catégorie"] || row["Catégorie"] || "";
    const subCat = row["Sous-Catégorie"] || row["Sous-Catégorie"] || "";
    const desc = row["Description"] || "";

    // Skip transfers (now checks description patterns too)
    if (isTransfer(cat, subCat, desc)) { skipped++; continue; }

    if (isPersonalAccount(compte)) {
      if (isIncome(cat)) { skipped++; continue; } // Skip personal income (salary handled separately)

      const absAmount = Math.abs(amount);
      if (absAmount < 0.5) { skipped++; continue; }

      // Skip mortgage payments — they're investment, not household
      if (subCat.toLowerCase().includes("mortgage")) { skipped++; continue; }

      const category = mapHouseholdCategory(cat, subCat, desc);

      await prisma.householdExpense.create({
        data: {
          date,
          amount: absAmount,
          category,
          description: desc.substring(0, 200),
        },
      });
      household++;
    } else if (isTVAAccount(compte)) {
      skipped++; continue; // TVA sub-account — internal treasury, not real revenue/expenses
    } else if (isBusinessAccount(compte)) {
      if (amount > 0 && !isTransfer(cat, subCat, desc)) {
        // Business revenue
        const lineId = detectBusinessLine(desc, cat, subCat);
        let client = "";
        const d = desc.toLowerCase();
        if (d.includes("street kred")) client = "Street Kred";
        else if (d.includes("newson")) client = "Newson";
        else client = desc.split(" ").slice(0, 3).join(" ");

        await prisma.revenue.create({
          data: {
            date,
            amount,
            description: desc.substring(0, 200),
            client,
            businessLineId: lineId,
          },
        });
        revenue++;
      } else if (amount < 0) {
        // Business expense
        const lineId = detectBusinessLine(desc, cat, subCat);
        const expCategory = subCat || cat;

        await prisma.businessExpense.create({
          data: {
            date,
            amount: Math.abs(amount),
            description: desc.substring(0, 200),
            category: expCategory.substring(0, 100),
            businessLineId: lineId,
          },
        });
        bizExp++;
      } else {
        skipped++;
      }
    } else {
      skipped++;
    }
  }

  console.log(`  ${filename}: ${household} household, ${revenue} revenue, ${bizExp} biz expenses, ${skipped} skipped`);
}

// ─── Import Monthly History (for months without Bankin data) ──
async function importMonthlyHistory() {
  const filePath = path.join(CSV_DIR, "Budget Adrien Naeem - Monthly History.csv");
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");

  // The Monthly History has a complex layout. Row 5 has totals per month.
  // Months are in columns, right to left: Nov, Oct, Sep, Aug, Jul, Jun, May, April, March, February, January, December
  // Each month has 2 columns: Revenus, Dépenses

  // Extract month columns from row 1
  const headerLine = parseCSVLine(lines[0]);
  const months: { name: string; year: number; revenueCol: number; expenseCol: number }[] = [];

  const monthMap: Record<string, number> = {
    jan: 1, january: 1, janvier: 1,
    feb: 2, february: 2, fevrier: 2,
    mar: 3, march: 3, mars: 3,
    apr: 4, april: 4, avril: 4,
    may: 5, mai: 5,
    jun: 6, june: 6, juin: 6,
    jul: 7, july: 7, juillet: 7,
    aug: 8, august: 8, aout: 8,
    sep: 9, sept: 9, september: 9, septembre: 9,
    oct: 10, october: 10, octobre: 10,
    nov: 11, november: 11, novembre: 11,
    dec: 12, december: 12, decembre: 12,
  };

  // Parse categories and amounts from specific rows
  // Row 9 (line index 8): Pole emploi
  // Row 10: Salaire CR
  // Row 21: Loyer
  // Row 22: Electricite
  // Row 40: Grocery
  // Row 41: Restaurant
  // etc.

  const categoryRows = [
    { lineIdx: 8, name: "Pole Emploi", household: "FIXED" as const, isIncome: true },
    { lineIdx: 9, name: "Salaire CR", household: "FIXED" as const, isIncome: true },
    { lineIdx: 20, name: "Loyer", household: "FIXED" as const, isIncome: false },
    { lineIdx: 21, name: "Electricite", household: "FIXED" as const, isIncome: false },
    { lineIdx: 24, name: "Mutuelle AON", household: "FIXED" as const, isIncome: false },
    { lineIdx: 30, name: "Epargne Nicolas", household: "NICOLAS" as const, isIncome: false },
    { lineIdx: 36, name: "Ecole Nicolas", household: "NICOLAS" as const, isIncome: false },
    { lineIdx: 37, name: "Cours Nicolas", household: "NICOLAS" as const, isIncome: false },
    { lineIdx: 39, name: "Grocery", household: "VARIABLE" as const, isIncome: false },
    { lineIdx: 40, name: "Restaurant", household: "VARIABLE" as const, isIncome: false },
    { lineIdx: 42, name: "Transport", household: "VARIABLE" as const, isIncome: false },
    { lineIdx: 43, name: "Public transportation", household: "FIXED" as const, isIncome: false },
    { lineIdx: 44, name: "Uber/Taxi", household: "VARIABLE" as const, isIncome: false },
    { lineIdx: 46, name: "Vacation", household: "FAMILY_TRAVEL" as const, isIncome: false },
    { lineIdx: 47, name: "Health", household: "VARIABLE" as const, isIncome: false },
    { lineIdx: 48, name: "Art/IT/Shopping", household: "VARIABLE" as const, isIncome: false },
  ];

  // Months with Bankin data — skip these to avoid duplicates
  const bankinMonths = new Set(["2-2025", "4-2025", "10-2025"]);

  // Parse month headers
  for (let col = 5; col < headerLine.length; col++) {
    const val = headerLine[col].trim().toLowerCase();
    if (monthMap[val] !== undefined) {
      months.push({
        name: headerLine[col].trim(),
        year: 2025,
        revenueCol: col,
        expenseCol: col + 1,
      });
    }
  }

  let created = 0;

  for (const catRow of categoryRows) {
    if (catRow.lineIdx >= lines.length) continue;
    const values = parseCSVLine(lines[catRow.lineIdx]);

    for (const m of months) {
      const monthNum = monthMap[m.name.toLowerCase()];
      if (!monthNum) continue;

      const key = `${monthNum}-${m.year}`;
      if (bankinMonths.has(key)) continue; // Skip months with Bankin data

      // Expense column
      const expCol = m.expenseCol;
      if (expCol >= values.length) continue;

      const amount = parseAmount(values[expCol]);
      if (!amount || amount <= 0) continue;

      if (catRow.isIncome) continue; // Skip income rows for household

      const date = new Date(m.year, monthNum - 1, 15); // Mid-month

      await prisma.householdExpense.create({
        data: {
          date,
          amount,
          category: catRow.household,
          description: `${catRow.name} (${m.name} aggregated)`,
        },
      });
      created++;
    }
  }

  console.log(`  Monthly History: ${created} aggregated household entries`);
}

// ─── Import Pro Budget ────────────────────────────────────────
async function importProBudget() {
  const filePath = path.join(CSV_DIR, "Budget Adrien Naeem - Pro Budget.csv");
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");

  // Similar structure — months in columns
  // Row 6: Freelancing income
  // Row 7+: expenses by category

  const headerLine = parseCSVLine(lines[0]);
  const monthMap: Record<string, number> = {
    jan: 1, january: 1, dec: 12, december: 12,
    feb: 2, february: 2, mar: 3, march: 3,
    apr: 4, april: 4, may: 5,
    jun: 6, jul: 7, agust: 8,
    sep: 9, oct: 10, nov: 11,
  };

  // Find month positions
  const months: { name: string; year: number; startCol: number }[] = [];
  for (let col = 5; col < headerLine.length; col++) {
    const val = headerLine[col].trim().toLowerCase();
    if (monthMap[val] !== undefined) {
      months.push({ name: headerLine[col].trim(), year: 2025, startCol: col });
    }
  }

  const bankinMonths = new Set(["2-2025", "4-2025", "10-2025"]);

  // Row 5 (index 5): Freelancing revenue
  // Row 11 (index 11): Restaurant
  // Row 13 (index 13): Uber/Taxi
  // Row 16 (index 16): Casa-Travel
  const proRows = [
    { lineIdx: 5, name: "Freelancing", isRevenue: true },
    { lineIdx: 6, name: "Telephone AN", isRevenue: false },
    { lineIdx: 7, name: "Qonto/Rev fees", isRevenue: false },
    { lineIdx: 8, name: "Google", isRevenue: false },
    { lineIdx: 10, name: "UberEats", isRevenue: false },
    { lineIdx: 11, name: "Restaurant", isRevenue: false },
    { lineIdx: 13, name: "Uber/Taxi", isRevenue: false },
    { lineIdx: 15, name: "Casa-Perso Transfer", isRevenue: false },
    { lineIdx: 16, name: "Casa-Carte KDO", isRevenue: false },
    { lineIdx: 17, name: "Casa-Travel", isRevenue: false },
  ];

  let revCreated = 0, expCreated = 0;

  for (const proRow of proRows) {
    if (proRow.lineIdx >= lines.length) continue;
    const values = parseCSVLine(lines[proRow.lineIdx]);

    for (const m of months) {
      const monthNum = monthMap[m.name.toLowerCase()];
      if (!monthNum) continue;
      const key = `${monthNum}-${m.year}`;
      if (bankinMonths.has(key)) continue;

      // Revenue col = startCol, Expense col = startCol + 1 (for expense rows)
      const col = proRow.isRevenue ? m.startCol : m.startCol + 1;
      if (col >= values.length) continue;

      const amount = parseAmount(values[col]);
      if (!amount || amount <= 0) continue;

      const date = new Date(m.year, monthNum - 1, 15);

      if (proRow.isRevenue) {
        await prisma.revenue.create({
          data: {
            date,
            amount,
            description: `${proRow.name} (${m.name} aggregated)`,
            client: "Freelance",
            businessLineId: LINE_IDS.gtm,
          },
        });
        revCreated++;
      } else {
        await prisma.businessExpense.create({
          data: {
            date,
            amount,
            description: `${proRow.name} (${m.name} aggregated)`,
            category: proRow.name,
            businessLineId: LINE_IDS.gtm,
          },
        });
        expCreated++;
      }
    }
  }

  console.log(`  Pro Budget: ${revCreated} revenue, ${expCreated} expenses`);
}

// ─── Import Overview as WealthSnapshots ───────────────────────
// FIX 5: Do NOT use income as cashPersonal. Create placeholder
// snapshots with zero balances — real balances must be entered
// manually since the Bankin CSVs don't contain end-of-month balances.
async function importOverviewSnapshots() {
  const monthsWithData = new Set<string>();

  // Find which months have transaction data
  const allHousehold = await prisma.householdExpense.findMany({ select: { date: true } });
  const allRevenue = await prisma.revenue.findMany({ select: { date: true } });

  for (const h of allHousehold) {
    const m = h.date.getMonth() + 1;
    const y = h.date.getFullYear();
    monthsWithData.add(`${m}-${y}`);
  }
  for (const r of allRevenue) {
    const m = r.date.getMonth() + 1;
    const y = r.date.getFullYear();
    monthsWithData.add(`${m}-${y}`);
  }

  let created = 0;
  for (const key of monthsWithData) {
    const [monthStr, yearStr] = key.split("-");
    const month = parseInt(monthStr);
    const year = parseInt(yearStr);

    await prisma.wealthSnapshot.upsert({
      where: { month_year: { month, year } },
      update: {},
      create: {
        month,
        year,
        cashPersonal: 0,
        cashBusiness: 0,
        emergencyFund: 0,
        investments: 0,
        debt: 0,
        butterflyValue: 0,
      },
    });
    created++;
  }

  console.log(`  WealthSnapshots: ${created} placeholder snapshots (balances need manual entry)`);
}

// ─── Import Invest CSV — real estate, debt, and insurance ─────
async function importInvest() {
  const filePath = path.join(CSV_DIR, "Budget Adrien Naeem - Invest.csv");
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");

  // Row 1: month headers — each month has 3 columns (Revenue, Asset, Expense)
  // Row 3 (index 2): monthly totals
  // Rows 5-21: individual investment items

  const headerLine = parseCSVLine(lines[0]);
  const monthMap: Record<string, number> = {
    janvier: 1, january: 1, jan: 1,
    february: 2, feb: 2, fevrier: 2,
    march: 3, mar: 3, mars: 3,
    april: 4, apr: 4, avril: 4,
    may: 5, mai: 5,
    june: 6, jun: 6, juin: 6,
    july: 7, jul: 7, juillet: 7,
    august: 8, agust: 8, aout: 8, aug: 8,
    september: 9, sep: 9, sept: 9,
    october: 10, oct: 10,
    november: 11, nov: 11,
    december: 12, dec: 12,
  };

  // Parse month positions from header row
  // The header has months at various columns, each followed by Revenue/Asset/Expense
  // We need to find the LAST occurrence of each month (2025 data, not 2024)
  const monthCols: { month: number; revCol: number; assetCol: number; expCol: number }[] = [];
  const seenMonths = new Map<number, number>(); // month -> last position

  for (let col = 5; col < headerLine.length; col++) {
    const val = headerLine[col].trim().toLowerCase();
    const monthNum = monthMap[val];
    if (monthNum !== undefined) {
      seenMonths.set(monthNum, col);
    }
  }

  // Use the last occurrence of each month (= 2025 data)
  for (const [monthNum, col] of seenMonths.entries()) {
    monthCols.push({
      month: monthNum,
      revCol: col,
      assetCol: col + 1,
      expCol: col + 2,
    });
  }

  // Row 3 (index 2): monthly totals — Revenue, Asset, Expense
  const totalsLine = parseCSVLine(lines[2]);
  let investExpenses = 0;

  // Import monthly investment expenses as FIXED household expenses
  // These are mortgage interest, insurance, property charges
  const bankinMonths = new Set(["2-2025", "4-2025", "10-2025"]);

  for (const mc of monthCols) {
    const key = `${mc.month}-2025`;
    // For Bankin months, these expenses are already partially captured via bank transactions
    // but mortgage payments were excluded. Let's import the total investment expense.

    const expAmount = parseAmount(totalsLine[mc.expCol]);
    const revAmount = parseAmount(totalsLine[mc.revCol]);
    const assetAmount = parseAmount(totalsLine[mc.assetCol]);

    if (expAmount && expAmount > 0) {
      // Only import for non-Bankin months to avoid partial duplicates
      if (!bankinMonths.has(key)) {
        const date = new Date(2025, mc.month - 1, 15);
        await prisma.householdExpense.create({
          data: {
            date,
            amount: expAmount,
            category: "FIXED",
            description: `Investment expenses — mortgage interest, insurance, property charges (${mc.month}/2025 aggregated)`,
          },
        });
        investExpenses++;
      }
    }
  }

  // Extract asset and debt values for WealthSnapshots
  // Static values from the Invest sheet:
  const investmentAssets = [
    { name: "SDC Abondant (MH)", value: 260000, row: 6 },
    { name: "SCPI Pierre Invt 8", value: 56000, row: 11 },
    { name: "Sérénipierre Assurances", value: 4750, row: 13 },
  ];
  const investmentDebts = [
    { name: "LCL appartement", value: 102000, row: 4 },
    { name: "Abondant loan #1", value: 95000, row: 9 },
    { name: "Abondant loan #2", value: 76000, row: 10 },
    { name: "CFF SCPI dette", value: 31200, row: 12 },
  ];

  const totalInvestments = investmentAssets.reduce((s, a) => s + a.value, 0);
  const totalDebt = investmentDebts.reduce((s, d) => s + d.value, 0);

  // Update all WealthSnapshots with real investment and debt data
  const snapshots = await prisma.wealthSnapshot.findMany();
  let updated = 0;
  for (const snap of snapshots) {
    await prisma.wealthSnapshot.update({
      where: { id: snap.id },
      data: {
        investments: totalInvestments,
        debt: totalDebt,
      },
    });
    updated++;
  }

  console.log(`  Invest: ${investExpenses} monthly investment expenses imported as FIXED household`);
  console.log(`  Invest: ${updated} WealthSnapshots updated with investments=${totalInvestments.toLocaleString()}€, debt=${totalDebt.toLocaleString()}€`);
  console.log(`  Invest: Net real estate equity = ${(totalInvestments - totalDebt).toLocaleString()}€`);
}

// ─── Main ─────────────────────────────────────────────────────
async function main() {
  console.log("Starting CSV import into Budget AN...\n");

  console.log("1. Importing Bankin transactions...");
  await importBankinCSV("Budget Adrien Naeem - Bankin feb.csv");
  await importBankinCSV("Budget Adrien Naeem - Bankin April.csv");
  await importBankinCSV("Budget Adrien Naeem - Bankin.csv");

  console.log("\n2. Importing Monthly History (non-Bankin months)...");
  await importMonthlyHistory();

  console.log("\n3. Importing Pro Budget (non-Bankin months)...");
  await importProBudget();

  console.log("\n4. Creating WealthSnapshots from Overview...");
  await importOverviewSnapshots();

  console.log("\n5. Importing Invest (real estate, debts, insurance)...");
  await importInvest();

  // Re-flag owner draws after reimport
  console.log("\n6. Flagging owner draws...");
  const ownerDrawResult = await prisma.businessExpense.updateMany({
    where: {
      OR: [
        { description: { contains: "Park Lane", mode: "insensitive" } },
        { description: { contains: "Casino Bagnoles", mode: "insensitive" } },
        { description: { contains: "Diptyque", mode: "insensitive" } },
        { description: { contains: "Kooples", mode: "insensitive" } },
        { description: { contains: "Rogue Fitness", mode: "insensitive" } },
        { description: { contains: "Moulin Rouge", mode: "insensitive" } },
        { description: { contains: "Amazon Prime", mode: "insensitive" } },
        { description: { contains: "Fnac", mode: "insensitive" } },
        { description: { contains: "Seagale", mode: "insensitive" } },
        { description: { contains: "Flying Tiger", mode: "insensitive" } },
        { description: { contains: "Jade Genin", mode: "insensitive" } },
        { description: { contains: "Avianca", mode: "insensitive" } },
      ],
    },
    data: { isOwnerDraw: true },
  });
  console.log(`  Owner draws: ${ownerDrawResult.count} flagged`);

  // Print summary
  const [hCount, rCount, beCount, wsCount] = await Promise.all([
    prisma.householdExpense.count(),
    prisma.revenue.count(),
    prisma.businessExpense.count(),
    prisma.wealthSnapshot.count(),
  ]);

  console.log("\n═══════════════════════════════════════");
  console.log("Import complete!");
  console.log(`  Household Expenses: ${hCount}`);
  console.log(`  Revenue entries:    ${rCount}`);
  console.log(`  Business Expenses:  ${beCount}`);
  console.log(`  Wealth Snapshots:   ${wsCount}`);
  console.log("═══════════════════════════════════════");
}

main()
  .catch((e) => {
    console.error("Import failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
