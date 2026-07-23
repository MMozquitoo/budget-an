import { describe, it, expect } from "vitest";
import {
  CATEGORY_GROUP,
  isBudgetable,
  budgetDirection,
  buildReport,
  roundNice,
  suggestBudgets,
} from "./budgets";

describe("CATEGORY_GROUP / isBudgetable", () => {
  it("maps categories to their group", () => {
    expect(CATEGORY_GROUP["GROCERIES"]).toBe("VARIABLE_EXPENSE");
    expect(CATEGORY_GROUP["RENT"]).toBe("FIXED_EXPENSE");
    expect(CATEGORY_GROUP["EMERGENCY_FUND"]).toBe("SAVINGS");
  });

  it("excludes income from budgetable categories", () => {
    expect(isBudgetable("SALARY")).toBe(false);
    expect(isBudgetable("GROCERIES")).toBe(true);
    expect(isBudgetable("EMERGENCY_FUND")).toBe(true);
    expect(isBudgetable("NOT_A_CATEGORY")).toBe(false);
  });
});

describe("budgetDirection", () => {
  it("treats savings as a goal and everything else as a cap", () => {
    expect(budgetDirection("SAVINGS")).toBe("goal");
    expect(budgetDirection("VARIABLE_EXPENSE")).toBe("cap");
    expect(budgetDirection("DEBT")).toBe("cap");
  });
});

describe("buildReport", () => {
  it("computes remaining, pct and cap health", () => {
    const r = buildReport(
      [
        { category: "GROCERIES", amount: 400 },
        { category: "RESTAURANTS", amount: 100 },
      ],
      { GROCERIES: 300, RESTAURANTS: 130 }
    );

    const groceries = r.lines.find((l) => l.category === "GROCERIES")!;
    expect(groceries.remaining).toBe(100);
    expect(groceries.pct).toBe(75);
    expect(groceries.health).toBe("ok");

    const resto = r.lines.find((l) => l.category === "RESTAURANTS")!;
    expect(resto.remaining).toBe(-30); // over budget
    expect(resto.health).toBe("over");
    expect(r.overCount).toBe(1);
  });

  it("flags a cap near its limit as a warning", () => {
    const r = buildReport([{ category: "GROCERIES", amount: 100 }], {
      GROCERIES: 90,
    });
    expect(r.lines[0].health).toBe("warning");
  });

  it("treats a savings budget as a goal to reach", () => {
    const r = buildReport(
      [{ category: "EMERGENCY_FUND", amount: 500 }],
      { EMERGENCY_FUND: 500 }
    );
    expect(r.lines[0].direction).toBe("goal");
    expect(r.lines[0].health).toBe("met");

    const behind = buildReport(
      [{ category: "EMERGENCY_FUND", amount: 500 }],
      { EMERGENCY_FUND: 100 }
    );
    expect(behind.lines[0].health).toBe("behind");
  });

  it("sums totals and counts unbudgeted cap spend, ignoring income", () => {
    const r = buildReport([{ category: "GROCERIES", amount: 400 }], {
      GROCERIES: 380,
      RESTAURANTS: 120, // budgetable cap, no budget → unbudgeted
      SALARY: 3000, // income → never counted
      EMERGENCY_FUND: 200, // savings goal, no budget → not "unbudgeted spend"
    });
    expect(r.totalBudget).toBe(400);
    expect(r.totalActual).toBe(380);
    expect(r.unbudgetedSpend).toBe(120);
  });
});

describe("roundNice", () => {
  it("rounds to nearest 10 at/above 100 and nearest 5 below", () => {
    expect(roundNice(0)).toBe(0);
    expect(roundNice(-5)).toBe(0);
    expect(roundNice(37)).toBe(35);
    expect(roundNice(38)).toBe(40);
    expect(roundNice(412)).toBe(410);
    expect(roundNice(416)).toBe(420);
  });
});

describe("suggestBudgets", () => {
  it("averages across all months, treating missing months as 0", () => {
    const s = suggestBudgets([
      { GROCERIES: 400, RESTAURANTS: 100 },
      { GROCERIES: 420 },
      { GROCERIES: 380, RESTAURANTS: 200 },
    ]);
    // GROCERIES mean = (400+420+380)/3 = 400
    expect(s.GROCERIES).toBe(400);
    // RESTAURANTS mean = (100+0+200)/3 ≈ 100 → nearest 10
    expect(s.RESTAURANTS).toBe(100);
  });

  it("ignores income and returns nothing for empty history", () => {
    expect(suggestBudgets([])).toEqual({});
    const s = suggestBudgets([{ SALARY: 3000, GROCERIES: 300 }]);
    expect(s.SALARY).toBeUndefined();
    expect(s.GROCERIES).toBe(300);
  });

  it("supports the median method", () => {
    const s = suggestBudgets(
      [{ GROCERIES: 100 }, { GROCERIES: 400 }, { GROCERIES: 420 }],
      "median"
    );
    expect(s.GROCERIES).toBe(400); // median of 100,400,420
  });
});
