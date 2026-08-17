/**
 * MCAN (Qonto business account) CSV import — pure, database-free core, mirroring
 * the shape of `lib/import.ts` (the personal bank import) so both share the
 * same dedup/incremental discipline. Reuses `fingerprint`/`dedupe`/`csvDateRange`
 * from `lib/import.ts` directly — they are generic, not tied to the personal
 * bank's CSV shape.
 *
 * Unlike the personal import, there is no category mapping table: every row
 * becomes group BUSINESS, and category is decided purely by the sign of the
 * amount (Qonto already signs it: negative = money out, positive = money in).
 */

import { type PreparedRow } from "./import";

/**
 * RFC4180-ish parser for Qonto's `;`-delimited export: quoted fields may
 * contain the delimiter, embedded newlines or escaped `""` quotes, which a
 * naive `split(";")`/`split("\n")` (fine for the personal bank CSV) breaks on.
 */
export function parseQontoCSV(content: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const c = content[i];
    if (inQuotes) {
      if (c === '"') {
        if (content[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ";") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && content[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.length > 1 || row[0] !== "") rows.push(row);
      row = [];
    } else {
      field += c;
    }
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }

  if (rows.length === 0) return [];
  const headers = rows[0].map((h) => h.trim());
  return rows.slice(1).map((values) => {
    const record: Record<string, string> = {};
    headers.forEach((h, i) => {
      record[h] = (values[i] ?? "").trim();
    });
    return record;
  });
}

/** Qonto's "DD-MM-YYYY HH:MM:SS" (local), stored at UTC noon like the rest of the app. */
export function parseQontoDate(dateStr: string): Date | null {
  const m = /^(\d{2})-(\d{2})-(\d{4})/.exec(dateStr.trim());
  if (!m) return null;
  const [, day, month, year] = m;
  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), 12, 0, 0));
}

export interface QontoPrepareResult {
  prepared: PreparedRow[];
  skippedPending: number;
  skippedInvalid: number;
  skippedBeforeYear: number;
}

/**
 * Turn parsed Qonto CSV rows into prepared BUSINESS transactions. Only
 * settled rows ("Exécuté" — card holds/"En cours" never happened) at or
 * after `yearFrom` are kept; category is BUSINESS_INCOME/BUSINESS_EXPENSE by
 * sign. `notes` carries Qonto's own cash-flow category as free text and
 * tags the row "MCAN" for `lib/accounts.ts` account breakdown.
 */
export function prepareQontoRows(
  rows: Record<string, string>[],
  opts: { yearFrom?: number } = {}
): QontoPrepareResult {
  const yearFrom = opts.yearFrom ?? 2026;
  const prepared: PreparedRow[] = [];
  let skippedPending = 0;
  let skippedInvalid = 0;
  let skippedBeforeYear = 0;

  for (const row of rows) {
    if ((row["Statut"] || "").trim() !== "Exécuté") {
      skippedPending++;
      continue;
    }

    const date = parseQontoDate(row["Date de la valeur (local)"] || "");
    const amount = parseFloat((row["Montant total (TTC)"] || "").replace(",", "."));
    if (!date || isNaN(amount) || amount === 0) {
      skippedInvalid++;
      continue;
    }
    if (date.getUTCFullYear() < yearFrom) {
      skippedBeforeYear++;
      continue;
    }

    const category = amount > 0 ? "BUSINESS_INCOME" : "BUSINESS_EXPENSE";
    const description =
      (row["Nom de la contrepartie"] || "").trim() ||
      (row["Référence"] || "").trim() ||
      "Compte pro MCAN";
    const cfCategory = (row["Catégorie de trésorerie"] || "").trim() || "Autre";
    const cfSubcategory = (row["Sous-catégorie de trésorerie"] || "").trim();
    const notes = `MCAN | ${cfCategory}${cfSubcategory ? ` > ${cfSubcategory}` : ""}`;

    prepared.push({
      date,
      amount: Math.abs(amount),
      group: "BUSINESS",
      category,
      description,
      notes,
    });
  }

  return { prepared, skippedPending, skippedInvalid, skippedBeforeYear };
}
