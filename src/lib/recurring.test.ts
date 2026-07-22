import { describe, it, expect } from "vitest";
import { detectRecurring, normalizeLabel, summariseRecurring } from "./recurring";

/** A charge on the 5th of each listed month, stored at UTC noon like the import does. */
function monthly(
  description: string,
  amounts: Array<[year: number, month: number, amount: number]>,
  extra: { category?: string; group?: string; recurring?: boolean } = {}
) {
  return amounts.map(([year, month, amount], i) => ({
    id: `${description}-${i}`,
    date: new Date(Date.UTC(year, month - 1, 5, 12, 0, 0)),
    amount,
    group: extra.group ?? "FIXED_EXPENSE",
    category: extra.category ?? "SUBSCRIPTIONS",
    description,
    recurring: extra.recurring,
  }));
}

const REF = new Date(Date.UTC(2026, 5, 20, 12, 0, 0)); // 20 June 2026

describe("normalizeLabel", () => {
  it("collapses card labels of the same payee onto one key", () => {
    expect(normalizeLabel("CARTE 12/03/25 NETFLIX.COM 1234")).toBe(
      normalizeLabel("CARTE 04/04/25 NETFLIX.COM 5678")
    );
  });

  it("strips accents and mandate references", () => {
    expect(normalizeLabel("PRLV SEPA Électricité RUM ABC123XYZ")).toBe("sepa electricite");
  });

  it("keeps distinct payees distinct", () => {
    expect(normalizeLabel("NETFLIX")).not.toBe(normalizeLabel("SPOTIFY"));
  });
});

describe("detectRecurring", () => {
  it("detects a monthly subscription from three charges", () => {
    const series = detectRecurring(
      monthly("NETFLIX", [
        [2026, 4, 13.49],
        [2026, 5, 13.49],
        [2026, 6, 13.49],
      ]),
      { referenceDate: REF }
    );
    expect(series).toHaveLength(1);
    expect(series[0]).toMatchObject({
      cadence: "MONTHLY",
      occurrences: 3,
      amount: 13.49,
      monthlyEquivalent: 13.49,
      active: true,
      source: "detected",
      variableAmount: false,
    });
  });

  it("ignores a payee seen only twice on a monthly cadence", () => {
    const series = detectRecurring(
      monthly("BOULANGERIE", [
        [2026, 5, 3.2],
        [2026, 6, 3.2],
      ]),
      { referenceDate: REF }
    );
    expect(series).toHaveLength(0);
  });

  it("still surfaces a charge the user flagged by hand", () => {
    const series = detectRecurring(
      monthly("ASSURANCE VIE", [[2026, 6, 90]], { recurring: true }),
      { referenceDate: REF }
    );
    expect(series).toHaveLength(1);
    expect(series[0].source).toBe("manual");
  });

  it("normalises a yearly charge to its monthly cost", () => {
    const series = detectRecurring(
      monthly("AMAZON PRIME", [
        [2024, 6, 69.9],
        [2025, 6, 69.9],
        [2026, 6, 69.9],
      ]),
      { referenceDate: REF }
    );
    expect(series[0].cadence).toBe("YEARLY");
    expect(series[0].monthlyEquivalent).toBeCloseTo(5.825, 2);
  });

  it("marks a subscription that stopped arriving as inactive", () => {
    const series = detectRecurring(
      monthly("SALLE DE SPORT", [
        [2025, 9, 29.9],
        [2025, 10, 29.9],
        [2025, 11, 29.9],
      ]),
      { referenceDate: REF }
    );
    expect(series[0].active).toBe(false);
  });

  it("flags a price increase", () => {
    const series = detectRecurring(
      monthly("SPOTIFY", [
        [2026, 3, 10.99],
        [2026, 4, 10.99],
        [2026, 5, 10.99],
        [2026, 6, 12.99],
      ]),
      { referenceDate: REF }
    );
    expect(series[0].priceChange).not.toBeNull();
    expect(series[0].priceChange!.from).toBeCloseTo(10.99, 2);
    expect(series[0].priceChange!.to).toBeCloseTo(12.99, 2);
    expect(series[0].priceChange!.pct).toBeGreaterThan(0);
  });

  it("does not call a stable amount a price change", () => {
    const series = detectRecurring(
      monthly("FREE MOBILE", [
        [2026, 4, 19.99],
        [2026, 5, 19.99],
        [2026, 6, 19.99],
      ]),
      { referenceDate: REF }
    );
    expect(series[0].priceChange).toBeNull();
  });

  it("marks a utility bill as variable rather than as a price change every month", () => {
    const series = detectRecurring(
      monthly("EDF", [
        [2026, 3, 80],
        [2026, 4, 140],
        [2026, 5, 60],
        [2026, 6, 110],
      ]),
      { referenceDate: REF }
    );
    expect(series[0].variableAmount).toBe(true);
  });

  it("treats two charges in one month as a single occurrence", () => {
    const rows = [
      ...monthly("ORANGE", [
        [2026, 4, 30],
        [2026, 5, 30],
        [2026, 6, 30],
      ]),
      {
        id: "orange-extra",
        date: new Date(Date.UTC(2026, 5, 20, 12, 0, 0)),
        amount: 30,
        group: "FIXED_EXPENSE",
        category: "INTERNET_PHONE",
        description: "ORANGE",
      },
    ];
    const series = detectRecurring(rows, { referenceDate: REF });
    expect(series[0].occurrences).toBe(3);
    expect(series[0].amount).toBe(60); // June actually cost 60
  });

  it("returns nothing for an empty history", () => {
    expect(detectRecurring([], { referenceDate: REF })).toEqual([]);
  });

  it("sorts by monthly cost, most expensive first", () => {
    const series = detectRecurring(
      [
        ...monthly("NETFLIX", [
          [2026, 4, 13.49],
          [2026, 5, 13.49],
          [2026, 6, 13.49],
        ]),
        ...monthly("LOYER", [
          [2026, 4, 1200],
          [2026, 5, 1200],
          [2026, 6, 1200],
        ]),
      ],
      { referenceDate: REF }
    );
    expect(series.map((s) => s.description)).toEqual(["LOYER", "NETFLIX"]);
  });
});

describe("summariseRecurring", () => {
  it("counts and totals only the active series", () => {
    const series = detectRecurring(
      [
        ...monthly("NETFLIX", [
          [2026, 4, 10],
          [2026, 5, 10],
          [2026, 6, 10],
        ]),
        ...monthly("SALLE DE SPORT", [
          [2025, 9, 30],
          [2025, 10, 30],
          [2025, 11, 30],
        ]),
      ],
      { referenceDate: REF }
    );
    const summary = summariseRecurring(series);
    expect(summary.count).toBe(1);
    expect(summary.inactiveCount).toBe(1);
    expect(summary.monthlyTotal).toBe(10);
    expect(summary.yearlyTotal).toBe(120);
  });
});
