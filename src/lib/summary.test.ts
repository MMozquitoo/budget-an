import { describe, it, expect } from "vitest";
import { aggregate, topCategories } from "./summary";

const tx = (group: string, category: string, amount: number) => ({
  group,
  category,
  amount,
});

describe("aggregate", () => {
  it("splits inflow, consumed money and outflow", () => {
    const t = aggregate([
      tx("INCOME", "SALARY", 3000),
      tx("FIXED_EXPENSE", "RENT", 1200),
      tx("VARIABLE_EXPENSE", "GROCERIES", 400),
      tx("UNEXPECTED", "HEALTH", 100),
      tx("SAVINGS", "EMERGENCY_FUND", 500),
      tx("DEBT", "CREDIT_CARD", 200),
    ]);

    expect(t.totalIncome).toBe(3000);
    // Savings is money kept, not money spent — it must stay out of expenses.
    expect(t.totalExpenses).toBe(1700);
    expect(t.totalOutflow).toBe(2400);
    expect(t.balance).toBe(600);
  });

  it("reports rates as percentages of income", () => {
    const t = aggregate([
      tx("INCOME", "SALARY", 2000),
      tx("SAVINGS", "GENERAL_SAVINGS", 500),
      tx("FIXED_EXPENSE", "RENT", 1000),
    ]);
    expect(t.savingsRate).toBe(25);
    expect(t.expenseRate).toBe(50);
  });

  it("does not divide by zero when there is no income", () => {
    const t = aggregate([tx("FIXED_EXPENSE", "RENT", 1000)]);
    expect(t.savingsRate).toBe(0);
    expect(t.expenseRate).toBe(0);
    expect(t.balance).toBe(-1000);
  });

  it("sums per group and per category", () => {
    const t = aggregate([
      tx("VARIABLE_EXPENSE", "GROCERIES", 30),
      tx("VARIABLE_EXPENSE", "GROCERIES", 70),
      tx("VARIABLE_EXPENSE", "RESTAURANTS", 25),
    ]);
    expect(t.byGroup.VARIABLE_EXPENSE).toBe(125);
    expect(t.byCategory.GROCERIES).toBe(100);
    expect(t.transactionCount).toBe(3);
  });

  it("ignores rows whose amount is not a number", () => {
    const t = aggregate([
      tx("INCOME", "SALARY", 1000),
      tx("INCOME", "SALARY", NaN),
    ]);
    expect(t.totalIncome).toBe(1000);
  });

  it("returns zeroes for an empty month", () => {
    const t = aggregate([]);
    expect(t.totalIncome).toBe(0);
    expect(t.balance).toBe(0);
    expect(t.transactionCount).toBe(0);
  });
});

describe("topCategories", () => {
  it("ranks by amount, largest first", () => {
    const ranked = topCategories({ RENT: 1200, GROCERIES: 400, PETS: 50 }, 2);
    expect(ranked).toEqual([
      { category: "RENT", total: 1200 },
      { category: "GROCERIES", total: 400 },
    ]);
  });
});
