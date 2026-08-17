import { describe, it, expect } from "vitest";
import { parseQontoCSV, parseQontoDate, prepareQontoRows } from "./qonto-import";

const HEADER =
  "Statut;Date de la valeur (UTC);Date de la valeur (local);Date de l'opération (UTC);" +
  "Date de l'opération (local);Montant total (TTC);Débit;Crédit;Solde;Devise;" +
  "Montant total (TTC) (local);Devise (local);Nom du compte;IBAN du compte;" +
  "Nom de la contrepartie;Référence;Catégorie de trésorerie;Sous-catégorie de trésorerie";

function row(fields: Record<string, string>): string {
  const cols = HEADER.split(";");
  return cols.map((c) => fields[c] ?? "").join(";");
}

describe("parseQontoCSV", () => {
  it("parses a simple semicolon-delimited row", () => {
    const csv = [HEADER, row({ Statut: "Exécuté", "Nom de la contrepartie": "ORANGE SA" })].join("\n");
    const rows = parseQontoCSV(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0]["Statut"]).toBe("Exécuté");
    expect(rows[0]["Nom de la contrepartie"]).toBe("ORANGE SA");
  });

  it("respects quoted fields containing the delimiter", () => {
    const csv = `${HEADER}\nExécuté;;;;;-10,00;;;;;;;;;"FOO ; BAR";;;`;
    const rows = parseQontoCSV(csv);
    expect(rows[0]["Nom de la contrepartie"]).toBe("FOO ; BAR");
  });

  it("respects escaped double quotes inside a quoted field", () => {
    const csv = `${HEADER}\nExécuté;;;;;-10,00;;;;;;;;;"SAY ""HI""";;;`;
    const rows = parseQontoCSV(csv);
    expect(rows[0]["Nom de la contrepartie"]).toBe('SAY "HI"');
  });

  it("returns nothing for an empty file", () => {
    expect(parseQontoCSV("")).toEqual([]);
  });
});

describe("parseQontoDate", () => {
  it("parses DD-MM-YYYY at UTC noon", () => {
    const d = parseQontoDate("17-08-2026 05:37:02");
    expect(d?.toISOString().slice(0, 10)).toBe("2026-08-17");
    expect(d?.getUTCHours()).toBe(12);
  });

  it("returns null for an unparseable string", () => {
    expect(parseQontoDate("not a date")).toBeNull();
  });
});

describe("prepareQontoRows", () => {
  const base = {
    "Date de la valeur (local)": "15-03-2026 10:00:00",
    "Nom de la contrepartie": "CLIENT SARL",
    "Catégorie de trésorerie": "Chiffre d'affaires",
    "Sous-catégorie de trésorerie": "",
  };

  it("keeps only settled rows at or after the target year", () => {
    const csv = [
      HEADER,
      row({ Statut: "Exécuté", ...base, "Montant total (TTC)": "2000,00" }),
      row({ Statut: "En cours", ...base, "Montant total (TTC)": "0,00" }),
      row({ Statut: "Exécuté", ...base, "Date de la valeur (local)": "10-05-2024 10:00:00", "Montant total (TTC)": "-50,00" }),
    ].join("\n");
    const { prepared, skippedPending, skippedBeforeYear } = prepareQontoRows(parseQontoCSV(csv));
    expect(prepared).toHaveLength(1);
    expect(skippedPending).toBe(1);
    expect(skippedBeforeYear).toBe(1);
  });

  it("categorizes by sign and tags the account in notes", () => {
    const rows = parseQontoCSV(
      [HEADER, row({ Statut: "Exécuté", ...base, "Montant total (TTC)": "2000,00" })].join("\n")
    );
    const { prepared } = prepareQontoRows(rows);
    expect(prepared).toHaveLength(1);
    expect(prepared[0].group).toBe("BUSINESS");
    expect(prepared[0].category).toBe("BUSINESS_INCOME");
    expect(prepared[0].amount).toBe(2000);
    expect(prepared[0].description).toBe("CLIENT SARL");
    expect(prepared[0].notes).toBe("MCAN | Chiffre d'affaires");
  });

  it("categorizes a debit as BUSINESS_EXPENSE with absolute amount", () => {
    const rows = parseQontoCSV(
      [
        HEADER,
        row({
          Statut: "Exécuté",
          ...base,
          "Montant total (TTC)": "-28,67",
          "Catégorie de trésorerie": "Dépenses liées aux technologies",
          "Sous-catégorie de trésorerie": "Hébergement",
        }),
      ].join("\n")
    );
    const { prepared } = prepareQontoRows(rows);
    expect(prepared[0].category).toBe("BUSINESS_EXPENSE");
    expect(prepared[0].amount).toBe(28.67);
    expect(prepared[0].notes).toBe("MCAN | Dépenses liées aux technologies > Hébergement");
  });

  it("skips rows with a zero or unparseable amount", () => {
    const rows = parseQontoCSV(
      [HEADER, row({ Statut: "Exécuté", ...base, "Montant total (TTC)": "0,00" })].join("\n")
    );
    const { prepared, skippedInvalid } = prepareQontoRows(rows);
    expect(prepared).toHaveLength(0);
    expect(skippedInvalid).toBe(1);
  });
});
