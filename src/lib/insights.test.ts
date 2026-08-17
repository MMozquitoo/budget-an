import { describe, it, expect } from "vitest";
import { categoryMovements as categoryMovementsRaw, savingsTrend, type MonthPoint } from "./insights";
import { DEFAULT_CATEGORY_GROUP, DEFAULT_GROUP_BEHAVIOR } from "./test-taxonomy";

const categoryMovements = (series: MonthPoint[], minDelta?: number) =>
  categoryMovementsRaw(series, DEFAULT_CATEGORY_GROUP, DEFAULT_GROUP_BEHAVIOR, minDelta);

const point = (
  key: string,
  income: number,
  savings: number,
  byCategory: Record<string, number>
): MonthPoint => {
  const expenses = Object.entries(byCategory)
    .filter(([c]) => !["SALARY", "FREELANCE"].includes(c))
    .reduce((s, [, v]) => s + v, 0);
  return { key, income, savings, expenses, byCategory };
};

describe("categoryMovements", () => {
  const series = [
    point("2026-01", 3000, 500, { SALARY: 3000, GROCERIES: 400, RESTAURANTS: 100 }),
    point("2026-02", 3000, 500, { SALARY: 3000, GROCERIES: 420, RESTAURANTS: 110 }),
    point("2026-03", 3000, 500, { SALARY: 3000, GROCERIES: 410, RESTAURANTS: 300 }),
  ];

  it("flags the category that moved most vs its trailing average", () => {
    const m = categoryMovements(series);
    expect(m[0].category).toBe("RESTAURANTS");
    expect(m[0].direction).toBe("up");
    expect(Math.round(m[0].average)).toBe(105); // (100+110)/2
    expect(m[0].current).toBe(300);
    expect(Math.round(m[0].deltaPct)).toBe(186); // 195/105
  });

  it("ignores income and sub-threshold wobbles", () => {
    const m = categoryMovements(series);
    expect(m.some((x) => x.category === "SALARY")).toBe(false);
    // GROCERIES barely moved (410 vs 410 avg) → below minDelta, excluded.
    expect(m.some((x) => x.category === "GROCERIES")).toBe(false);
  });

  it("returns nothing with fewer than two months", () => {
    expect(categoryMovements(series.slice(0, 1))).toEqual([]);
  });

  it("ignores internal transfers", () => {
    const withTransfer = [
      point("2026-01", 3000, 500, { SALARY: 3000, GROCERIES: 400, INTERNAL_TRANSFER: 100 }),
      point("2026-02", 3000, 500, { SALARY: 3000, GROCERIES: 420, INTERNAL_TRANSFER: 900 }),
    ];
    const m = categoryMovements(withTransfer);
    expect(m.some((x) => x.category === "INTERNAL_TRANSFER")).toBe(false);
  });
});

describe("savingsTrend", () => {
  it("computes latest vs previous vs trailing average", () => {
    const t = savingsTrend([
      point("2026-01", 3000, 600, {}), // 20%
      point("2026-02", 3000, 900, {}), // 30%
      point("2026-03", 3000, 300, {}), // 10%
    ])!;
    expect(Math.round(t.current)).toBe(10);
    expect(Math.round(t.previous)).toBe(30);
    expect(Math.round(t.average)).toBe(25); // mean of 20,30
    expect(t.direction).toBe("down");
    expect(Math.round(t.deltaPts)).toBe(-20);
  });

  it("is flat within a point of noise", () => {
    const t = savingsTrend([
      point("2026-01", 3000, 600, {}),
      point("2026-02", 3000, 615, {}),
    ])!;
    expect(t.direction).toBe("flat");
  });
});
