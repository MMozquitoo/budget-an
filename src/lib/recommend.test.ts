import { describe, it, expect } from "vitest";
import { recommend, totalOpportunity } from "./recommend";
import type { BudgetReport } from "./budgets";
import type { CategoryMovement, SavingsTrend } from "./insights";

const line = (
  category: string,
  group: string,
  direction: "cap" | "goal",
  budget: number,
  actual: number,
  health: string
) => ({
  category,
  group,
  direction,
  budget,
  actual,
  remaining: budget - actual,
  pct: budget > 0 ? (actual / budget) * 100 : 0,
  health: health as "ok" | "warning" | "over" | "behind" | "close" | "met",
});

const report = (lines: ReturnType<typeof line>[]): BudgetReport => ({
  lines,
  totalBudget: lines.reduce((s, l) => s + l.budget, 0),
  totalActual: lines.reduce((s, l) => s + l.actual, 0),
  unbudgetedSpend: 0,
  overCount: lines.filter((l) => l.health === "over").length,
});

const labels = { RESTAURANTS: "Restaurants", CLOTHING: "Vêtements", ENTERTAINMENT: "Loisirs" };

describe("recommend", () => {
  it("flags an over-budget category with the overspend as impact", () => {
    const recs = recommend({
      budgetReport: report([line("RESTAURANTS", "VARIABLE_EXPENSE", "cap", 100, 150, "over")]),
      labels,
    });
    expect(recs).toHaveLength(1);
    expect(recs[0].type).toBe("over_budget");
    expect(recs[0].severity).toBe("high"); // 50 over >= 25% of budget
    expect(recs[0].estimatedMonthly).toBe(50);
    expect(recs[0].title).toContain("Restaurants");
  });

  it("suggests reallocating a barely-used budget", () => {
    const recs = recommend({
      budgetReport: report([line("CLOTHING", "VARIABLE_EXPENSE", "cap", 200, 20, "ok")]),
      labels,
    });
    expect(recs[0].type).toBe("unused_budget");
    expect(recs[0].estimatedMonthly).toBe(180);
  });

  it("flags dead subscriptions and price hikes", () => {
    const recs = recommend({
      subscriptions: [
        { description: "Gym", active: false, monthlyEquivalent: 30 },
        { description: "Netflix", active: true, monthlyEquivalent: 15, priceChange: { from: 13, to: 15, pct: 15 } },
      ],
    });
    const dead = recs.find((r) => r.type === "dead_subscription")!;
    expect(dead.severity).toBe("high");
    expect(dead.estimatedMonthly).toBe(30);
    const hike = recs.find((r) => r.type === "price_hike")!;
    expect(hike.estimatedMonthly).toBe(2);
  });

  it("flags a spending anomaly not already covered by a budget", () => {
    const movements: CategoryMovement[] = [
      { category: "ENTERTAINMENT", group: "VARIABLE_EXPENSE", current: 300, average: 100, delta: 200, deltaPct: 200, direction: "up" },
    ];
    const recs = recommend({ movements, labels });
    expect(recs[0].type).toBe("anomaly");
    expect(recs[0].estimatedMonthly).toBe(200);
  });

  it("flags a falling savings rate", () => {
    const savings: SavingsTrend = { current: 10, previous: 25, average: 20, deltaPts: -15, direction: "down" };
    const recs = recommend({ savings });
    expect(recs[0].type).toBe("savings_drop");
    expect(recs[0].severity).toBe("high");
  });

  it("ranks high severity before low and sums the opportunity", () => {
    const recs = recommend({
      budgetReport: report([
        line("RESTAURANTS", "VARIABLE_EXPENSE", "cap", 100, 150, "over"), // high
        line("CLOTHING", "VARIABLE_EXPENSE", "cap", 200, 20, "ok"), // low unused
      ]),
      labels,
    });
    expect(recs[0].severity).toBe("high");
    expect(recs[recs.length - 1].severity).toBe("low");
    expect(totalOpportunity(recs)).toBe(230); // 50 + 180
  });
});
