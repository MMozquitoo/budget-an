/**
 * Pure aggregation for the monthly summary.
 *
 * Kept out of the route handler so the money maths is unit-testable without a
 * database, and so the API, the dashboard and the chat agent can never drift
 * into computing the same totals in three slightly different ways.
 */

export interface TxLite {
  amount: number;
  group: string;
  category: string;
}

export interface Totals {
  byGroup: Record<string, number>;
  byCategory: Record<string, number>;
  totalIncome: number;
  totalFixedExpense: number;
  totalVariableExpense: number;
  totalSavings: number;
  totalDebt: number;
  totalUnexpected: number;
  /** Money actually consumed: fixed + variable + unexpected. Excludes savings. */
  totalExpenses: number;
  /** Everything that left the account: expenses + savings + debt. */
  totalOutflow: number;
  balance: number;
  savingsRate: number;
  expenseRate: number;
  transactionCount: number;
}

/** Groups that count as consumed money (not savings, not debt repayment). */
export const EXPENSE_GROUPS = [
  "FIXED_EXPENSE",
  "VARIABLE_EXPENSE",
  "UNEXPECTED",
] as const;

export function aggregate(transactions: TxLite[]): Totals {
  const byGroup: Record<string, number> = {};
  const byCategory: Record<string, number> = {};

  for (const t of transactions) {
    const amt = Number(t.amount);
    if (!Number.isFinite(amt)) continue;
    byGroup[t.group] = (byGroup[t.group] || 0) + amt;
    byCategory[t.category] = (byCategory[t.category] || 0) + amt;
  }

  const totalIncome = byGroup["INCOME"] || 0;
  const totalFixedExpense = byGroup["FIXED_EXPENSE"] || 0;
  const totalVariableExpense = byGroup["VARIABLE_EXPENSE"] || 0;
  const totalSavings = byGroup["SAVINGS"] || 0;
  const totalDebt = byGroup["DEBT"] || 0;
  const totalUnexpected = byGroup["UNEXPECTED"] || 0;

  const totalExpenses =
    totalFixedExpense + totalVariableExpense + totalUnexpected;
  const totalOutflow = totalExpenses + totalSavings + totalDebt;

  return {
    byGroup,
    byCategory,
    totalIncome,
    totalFixedExpense,
    totalVariableExpense,
    totalSavings,
    totalDebt,
    totalUnexpected,
    totalExpenses,
    totalOutflow,
    balance: totalIncome - totalOutflow,
    savingsRate: totalIncome > 0 ? (totalSavings / totalIncome) * 100 : 0,
    expenseRate: totalIncome > 0 ? (totalExpenses / totalIncome) * 100 : 0,
    transactionCount: transactions.length,
  };
}

/** The top `limit` categories by amount, largest first. */
export function topCategories(
  byCategory: Record<string, number>,
  limit = 10
): Array<{ category: string; total: number }> {
  return Object.entries(byCategory)
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([category, total]) => ({ category, total }));
}
