import { describe, it, expect } from "vitest";
import {
  parseCSV,
  isInternalTransfer,
  fingerprint,
  parseDate,
  prepareRows,
  dedupe,
  type PreparedRow,
} from "./import";
import type { RuleLike } from "./rules";

const row = (
  date: string,
  montant: string,
  cat: string,
  sub: string,
  desc: string,
  compte = "Boursorama"
) => ({
  Date: date,
  Montant: montant,
  Catégorie: cat,
  "Sous-Catégorie": sub,
  Description: desc,
  Compte: compte,
});

describe("parseCSV", () => {
  it("parses a semicolon-delimited export", () => {
    const rows = parseCSV(
      'Date;Montant;Description\n"15/03/2026";"-45,50";"MONOPRIX"\n"16/03/2026";"-3,00";"CAFE"'
    );
    expect(rows).toHaveLength(2);
    expect(rows[0].Date).toBe("15/03/2026");
    expect(rows[0].Montant).toBe("-45,50");
    expect(rows[1].Description).toBe("CAFE");
  });

  it("returns nothing for empty input", () => {
    expect(parseCSV("")).toEqual([]);
  });
});

describe("isInternalTransfer", () => {
  it("catches internal transfers and the joint label", () => {
    expect(isInternalTransfer("Internal transfer", "whatever")).toBe(true);
    expect(isInternalTransfer("", "VIR NAEEM OU RODRIGUEZ")).toBe(true);
    expect(isInternalTransfer("", "Virement De: Adrien Naeem")).toBe(true);
  });

  it("keeps external payments that merely name Adrien as payer", () => {
    expect(isInternalTransfer("", "Flatlooker Virement De Adrien Naeem")).toBe(false);
    expect(isInternalTransfer("", "MONOPRIX PARIS")).toBe(false);
  });
});

describe("fingerprint", () => {
  it("is stable for the same day/amount/payee", () => {
    const d = parseDate("15/03/2026");
    expect(fingerprint(d, 45.5, "  MONOPRIX   PARIS ")).toBe(
      fingerprint(parseDate("15/03/2026"), 45.5, "monoprix paris")
    );
  });
});

describe("prepareRows", () => {
  it("maps a grocery expense and packs account into notes", () => {
    const { prepared } = prepareRows([row("15/03/2026", "-45,50", "Food & Dining", "Supermarkets / Groceries", "MONOPRIX")], []);
    expect(prepared).toHaveLength(1);
    expect(prepared[0].group).toBe("VARIABLE_EXPENSE");
    expect(prepared[0].category).toBe("GROCERIES");
    expect(prepared[0].amount).toBe(45.5);
    expect(prepared[0].notes).toBe("Boursorama | Food & Dining > Supermarkets / Groceries");
  });

  it("treats money-in on an expense category as a refund", () => {
    const { prepared } = prepareRows([row("15/03/2026", "20,00", "Food & Dining", "Restaurants", "REMBOURSEMENT")], []);
    expect(prepared[0].group).toBe("INCOME");
    expect(prepared[0].category).toBe("OTHER_INCOME");
  });

  it("skips internal transfers and counts unmapped rows", () => {
    const res = prepareRows(
      [
        row("15/03/2026", "-100,00", "Withdrawals, checks & transfer", "Internal transfer", "VIR"),
        row("15/03/2026", "-10,00", "Totally", "Unknown thing", "MYSTERY"),
      ],
      []
    );
    expect(res.prepared).toHaveLength(0);
    expect(res.skippedTransfer).toBe(1);
    expect(res.skippedUnmapped).toBe(1);
    expect(res.unmapped[0].description).toBe("MYSTERY");
  });

  it("lets a user rule win over the built-in mapping", () => {
    const rules: RuleLike[] = [
      { matchType: "CONTAINS", matchValue: "netflix", group: "FIXED_EXPENSE", category: "SUBSCRIPTIONS", active: true, name: "Netflix" },
    ];
    const { prepared, byRule } = prepareRows(
      [row("15/03/2026", "-13,49", "Entertainment", "Amusements", "NETFLIX.COM")],
      rules
    );
    expect(prepared[0].category).toBe("SUBSCRIPTIONS");
    expect(prepared[0].ruleName).toBe("Netflix");
    expect(byRule).toBe(1);
  });
});

describe("dedupe", () => {
  const prep = (date: string, amount: number, desc: string): PreparedRow => ({
    date: parseDate(date), amount, group: "VARIABLE_EXPENSE", category: "RESTAURANTS", description: desc, notes: "",
  });

  it("keeps the surplus when a fingerprint already exists (count-based)", () => {
    const prepared = [
      prep("15/03/2026", 3, "CAFE"),
      prep("15/03/2026", 3, "CAFE"), // two identical coffees
      prep("16/03/2026", 50, "RESTO"), // unique
    ];
    const existing = [{ date: parseDate("15/03/2026"), amount: 3, description: "CAFE" }]; // one already stored
    const { toInsert, alreadyPresent } = dedupe(prepared, existing);
    expect(alreadyPresent).toBe(1);
    expect(toInsert).toHaveLength(2); // one surplus coffee + the resto
    expect(toInsert.some((r) => r.description === "RESTO")).toBe(true);
  });
});
