/**
 * Bank CSV import — the pure, database-free core. Shared by the CLI
 * (scripts/import-bank.ts) and the web import (/api/import/*), so the mapping,
 * dedup and sign logic can never drift between them.
 *
 * The import is incremental: dedup by fingerprint count, so re-importing an
 * overlapping export is a no-op, and existing rows (with any manual
 * reclassification, split or note) are never touched.
 */

import { classify, type RuleLike } from "./rules";

// Guardrails for the web import: reject oversized payloads before parsing.
export const MAX_CSV_BYTES = 2_000_000; // ~2 MB
export const MAX_CSV_ROWS = 20_000;

// Bank "Catégorie > Sous-Catégorie" → [group, category]
export const MAPPING: Record<string, [string, string]> = {
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

// Fallback by main category when the exact subcategory is unmapped.
export const CATEGORY_FALLBACK: Record<string, [string, string]> = {
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

// Internal transfers between the couple's own accounts are not real income or
// expense. Identified by the bank's "Internal transfer" subcategory, the joint
// "Naeem Ou Rodriguez" label, or Adrien as the SENDER (the colon is required so
// external payments that merely name Adrien as payer — e.g. rent — are kept).
export function isInternalTransfer(sub: string, desc: string): boolean {
  if (sub === "Internal transfer") return true;
  const d = desc.toLowerCase();
  if (d.includes("naeem ou rodriguez")) return true;
  if (/\bde\s*:\s*(m\.?|mr\.?|mme\.?)?\s*adrien\s+(imran\s+)?naeem/.test(d)) return true;
  if (d.includes("adrien naeem sent from")) return true;
  return false;
}

export function parseCSV(content: string): Record<string, string>[] {
  const lines = content.split("\n").filter((l) => l.trim());
  if (lines.length === 0) return [];
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

// Store at UTC noon so the calendar day is timezone-invariant.
export function parseDate(dateStr: string): Date {
  const [day, month, year] = dateStr.split("/");
  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), 12, 0, 0));
}

/** Bank identity of a transaction: same day + amount + payee = same row. */
export function fingerprint(date: Date, amount: number, description: string): string {
  return [
    date.toISOString().slice(0, 10),
    amount.toFixed(2),
    description.toLowerCase().replace(/\s+/g, " ").trim(),
  ].join("|");
}

export interface PreparedRow {
  date: Date;
  amount: number;
  group: string;
  category: string;
  description: string;
  notes: string;
  ruleName?: string;
}

export interface PrepareResult {
  prepared: PreparedRow[];
  skippedTransfer: number;
  skippedInvalid: number;
  skippedUnmapped: number;
  byRule: number;
  unmapped: Array<{ key: string; description: string; amount: number }>;
}

/**
 * Turn parsed CSV rows into prepared transactions. User rules win over the
 * built-in mapping; sign decides direction (money-in on an expense = refund,
 * money-out on income = reversal). Internal transfers and invalid rows are dropped.
 */
export function prepareRows(rows: Record<string, string>[], rules: RuleLike[]): PrepareResult {
  const prepared: PreparedRow[] = [];
  let skippedTransfer = 0;
  let skippedInvalid = 0;
  let skippedUnmapped = 0;
  let byRule = 0;
  const unmapped: Array<{ key: string; description: string; amount: number }> = [];

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
      unmapped.push({ key, description, amount });
      skippedUnmapped++;
      continue;
    }
    if (matched) byRule++;

    let [group, category] = mapping;
    if (amount > 0 && group !== "INCOME" && group !== "SAVINGS") {
      group = "INCOME"; category = "OTHER_INCOME"; // refund
    }
    if (amount < 0 && group === "INCOME") {
      group = "UNEXPECTED"; category = "UNPLANNED"; // reversal
    }

    prepared.push({
      date: parseDate(dateStr),
      amount: Math.abs(amount),
      group,
      category,
      description,
      notes,
      ruleName: matched?.ruleName,
    });
  }

  return { prepared, skippedTransfer, skippedInvalid, skippedUnmapped, byRule, unmapped };
}

/** Inclusive-ish date window covering the prepared rows (to fetch existing rows). */
export function csvDateRange(prepared: PreparedRow[]): { from: Date; to: Date } | null {
  if (prepared.length === 0) return null;
  const times = prepared.map((d) => d.date.getTime());
  return {
    from: new Date(Math.min(...times)),
    to: new Date(Math.max(...times) + 24 * 60 * 60 * 1000),
  };
}

export interface DedupeResult {
  toInsert: PreparedRow[];
  alreadyPresent: number;
}

/**
 * Keep only the CSV rows not already stored, deduping by fingerprint COUNT — two
 * identical coffees on the same day are two real transactions.
 */
export function dedupe(
  prepared: PreparedRow[],
  existing: Array<{ date: Date; amount: number; description: string }>
): DedupeResult {
  const existingCounts = new Map<string, number>();
  for (const e of existing) {
    const fp = fingerprint(e.date, Number(e.amount), e.description);
    existingCounts.set(fp, (existingCounts.get(fp) || 0) + 1);
  }

  const csvGroups = new Map<string, PreparedRow[]>();
  for (const d of prepared) {
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

  return { toInsert, alreadyPresent };
}
