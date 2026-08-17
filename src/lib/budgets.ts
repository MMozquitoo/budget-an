/**
 * Pure budget logic — no database, no dates.
 *
 * Kept database-free so the maths is unit-testable and so the API, the dashboard
 * and the chat agent all read budget progress the same way (same rule as
 * `summary.ts`). A budget is one amount per (month, year, category):
 *   - for expense/debt categories it is a CEILING you want to stay under,
 *   - for savings categories it is a TARGET you want to reach.
 *
 * `categoryGroup` (category key -> group key) and `groupBehavior` (group key
 * -> "income"|"expense"|"savings"|"debt"|"excluded") come from the dynamic
 * taxonomy (lib/taxonomy.ts) — passed in explicitly rather than imported, so
 * this stays testable and works for any group/category Adrien creates later.
 */

import { monthKeyInZone, shiftMonth } from "./utils";

/** Categories that can hold a budget — anything except income and "excluded" groups (transfers, MCAN's own cash flow). */
export function isBudgetable(
  category: string,
  categoryGroup: Record<string, string>,
  groupBehavior: Record<string, string>
): boolean {
  const group = categoryGroup[category];
  if (group === undefined) return false;
  const behavior = groupBehavior[group];
  return behavior !== "income" && behavior !== "excluded";
}

export type BudgetDirection = "cap" | "goal";

/** Savings-behaving groups are goals to reach; everything else is a ceiling. */
export function budgetDirection(group: string, groupBehavior: Record<string, string>): BudgetDirection {
  return groupBehavior[group] === "savings" ? "goal" : "cap";
}

export type BudgetHealth =
  | "ok" // cap: comfortably under
  | "warning" // cap: close to the limit
  | "over" // cap: exceeded
  | "behind" // goal: not on track
  | "close" // goal: nearly there
  | "met"; // goal: reached

export interface BudgetLine {
  category: string;
  group: string;
  direction: BudgetDirection;
  budget: number;
  actual: number;
  /** cap: budget - actual (can go negative). goal: how much is left to reach. */
  remaining: number;
  /** actual / budget as a percentage (0 budget → 100 if any actual, else 0). */
  pct: number;
  health: BudgetHealth;
}

export interface BudgetReport {
  lines: BudgetLine[];
  totalBudget: number;
  totalActual: number;
  /** Actual spend in budgetable expense/debt categories that have NO budget. */
  unbudgetedSpend: number;
  overCount: number;
}

function pctOf(actual: number, budget: number): number {
  if (budget > 0) return (actual / budget) * 100;
  return actual > 0 ? 100 : 0;
}

function capHealth(pct: number): BudgetHealth {
  if (pct > 100) return "over";
  if (pct >= 85) return "warning";
  return "ok";
}

function goalHealth(pct: number): BudgetHealth {
  if (pct >= 100) return "met";
  if (pct >= 75) return "close";
  return "behind";
}

/**
 * Merge a set of budgets with the month's actual spend per category.
 * `actualByCategory` is the `byCategory` map from `summary.ts` aggregate().
 */
export function buildReport(
  budgets: Array<{ category: string; amount: number }>,
  actualByCategory: Record<string, number>,
  categoryGroup: Record<string, string>,
  groupBehavior: Record<string, string>
): BudgetReport {
  const budgetedCats = new Set(budgets.map((b) => b.category));

  const lines: BudgetLine[] = budgets.map((b) => {
    const group = categoryGroup[b.category] ?? "UNEXPECTED";
    const direction = budgetDirection(group, groupBehavior);
    const actual = actualByCategory[b.category] ?? 0;
    const budget = b.amount;
    const pct = pctOf(actual, budget);
    return {
      category: b.category,
      group,
      direction,
      budget,
      actual,
      remaining: budget - actual,
      pct,
      health: direction === "cap" ? capHealth(pct) : goalHealth(pct),
    };
  });

  lines.sort((a, b) => b.pct - a.pct);

  // Spend in budgetable cap categories that were never given a budget.
  let unbudgetedSpend = 0;
  for (const [category, amount] of Object.entries(actualByCategory)) {
    if (budgetedCats.has(category)) continue;
    if (!isBudgetable(category, categoryGroup, groupBehavior)) continue;
    if (budgetDirection(categoryGroup[category], groupBehavior) !== "cap") continue;
    unbudgetedSpend += amount;
  }

  return {
    lines,
    totalBudget: lines.reduce((s, l) => s + l.budget, 0),
    totalActual: lines.reduce((s, l) => s + l.actual, 0),
    unbudgetedSpend,
    overCount: lines.filter((l) => l.health === "over").length,
  };
}

/** Round to a friendly step: nearest 10 at/above 100, nearest 5 below. */
export function roundNice(value: number): number {
  if (value <= 0) return 0;
  const step = value >= 100 ? 10 : 5;
  return Math.round(value / step) * step;
}

/**
 * Suggest a budget per category from history. `monthlyByCategory` is one
 * `byCategory` map per month in the look-back window (Adrien asked for 6–9).
 * The suggestion is the mean across ALL provided months (missing = 0), so a
 * sporadic category is not over-budgeted, then rounded to a friendly number.
 */
export function suggestBudgets(
  monthlyByCategory: Array<Record<string, number>>,
  categoryGroup: Record<string, string>,
  groupBehavior: Record<string, string>,
  method: "mean" | "median" = "mean"
): Record<string, number> {
  const months = monthlyByCategory.length;
  if (months === 0) return {};

  const categories = new Set<string>();
  for (const m of monthlyByCategory)
    for (const c of Object.keys(m)) if (isBudgetable(c, categoryGroup, groupBehavior)) categories.add(c);

  const out: Record<string, number> = {};
  for (const category of categories) {
    const series = monthlyByCategory.map((m) => m[category] ?? 0);
    let value: number;
    if (method === "median") {
      const sorted = [...series].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      value =
        sorted.length % 2 === 0
          ? (sorted[mid - 1] + sorted[mid]) / 2
          : sorted[mid];
    } else {
      value = series.reduce((s, v) => s + v, 0) / months;
    }
    const rounded = roundNice(value);
    if (rounded > 0) out[category] = rounded;
  }
  return out;
}

/**
 * Suggest budgets from a flat transaction list, bucketed into the `months` whole
 * months BEFORE the anchor (month, year). Months with no spend still count as a
 * zero in the average, so a sporadic category is not over-budgeted. Shared by the
 * /api/budgets/suggest route and the chat agent's prefill tool.
 */
export function suggestFromTransactions(
  transactions: Array<{ amount: number; category: string; date: Date }>,
  anchorYear: number,
  anchorMonth: number,
  months: number,
  categoryGroup: Record<string, string>,
  groupBehavior: Record<string, string>
): Record<string, number> {
  const buckets = new Map<string, Record<string, number>>();
  for (let i = months; i >= 1; i--) {
    const { year, month } = shiftMonth(anchorYear, anchorMonth, -i);
    buckets.set(`${year}-${String(month).padStart(2, "0")}`, {});
  }
  for (const t of transactions) {
    const bucket = buckets.get(monthKeyInZone(t.date));
    if (!bucket) continue;
    bucket[t.category] = (bucket[t.category] ?? 0) + t.amount;
  }
  return suggestBudgets([...buckets.values()], categoryGroup, groupBehavior);
}
