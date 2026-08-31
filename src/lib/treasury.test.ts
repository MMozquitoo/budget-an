import { describe, it, expect } from "vitest";
import { computeTreasuryStats } from "./treasury";

describe("computeTreasuryStats", () => {
  it("matches Adrien's worked example", () => {
    // Août 51 000, Juillet 47 000, Mai 43 000 (3 mois avant août).
    const stats = computeTreasuryStats([
      { month: 5, year: 2026, amount: 43000 },
      { month: 6, year: 2026, amount: 44500 },
      { month: 7, year: 2026, amount: 47000 },
      { month: 8, year: 2026, amount: 51000 },
    ]);

    expect(stats.current?.amount).toBe(51000);
    expect(stats.vsPreviousMonth.amount).toBe(4000);
    expect(stats.vsPreviousMonth.pct).toBeCloseTo(8.51, 1);
    expect(stats.vsThreeMonthsAgo.amount).toBe(8000);
    expect(stats.vsThreeMonthsAgo.pct).toBeCloseTo(18.6, 1);
    expect(stats.monthlyTrend).toBeCloseTo(2666.67, 1);
  });

  it("reports n/d instead of a wrong delta when a month is missing", () => {
    // Mai et juillet manquent : ne doit pas comparer août avec juin (le plus
    // proche disponible) par erreur, ni avec avril.
    const stats = computeTreasuryStats([
      { month: 4, year: 2026, amount: 40000 },
      { month: 6, year: 2026, amount: 44500 },
      { month: 8, year: 2026, amount: 51000 },
    ]);

    expect(stats.previousMonth).toBeNull();
    expect(stats.vsPreviousMonth).toEqual({ amount: null, pct: null });
    expect(stats.threeMonthsAgo).toBeNull();
    expect(stats.vsThreeMonthsAgo).toEqual({ amount: null, pct: null });
    expect(stats.monthlyTrend).toBeNull();
  });

  it("handles year rollover when looking 3 months back", () => {
    const stats = computeTreasuryStats([
      { month: 11, year: 2025, amount: 40000 },
      { month: 1, year: 2026, amount: 45000 },
      { month: 2, year: 2026, amount: 48000 },
    ]);

    expect(stats.threeMonthsAgo?.amount).toBe(40000);
    expect(stats.monthlyTrend).toBeCloseTo((48000 - 40000) / 3, 5);
  });

  it("avoids dividing by zero when the base snapshot is 0", () => {
    const stats = computeTreasuryStats([
      { month: 7, year: 2026, amount: 0 },
      { month: 8, year: 2026, amount: 500 },
    ]);

    expect(stats.vsPreviousMonth.amount).toBe(500);
    expect(stats.vsPreviousMonth.pct).toBeNull();
  });

  it("returns nulls and an empty chart for no data", () => {
    const stats = computeTreasuryStats([]);
    expect(stats.current).toBeNull();
    expect(stats.chart).toEqual([]);
  });

  it("caps the chart series at the last 6 snapshots", () => {
    const snapshots = Array.from({ length: 9 }, (_, i) => ({
      month: (i % 12) + 1,
      year: 2026,
      amount: i * 1000,
    }));
    const stats = computeTreasuryStats(snapshots);
    expect(stats.chart).toHaveLength(6);
    expect(stats.chart[0].amount).toBe(3000);
    expect(stats.chart[5].amount).toBe(8000);
  });
});
