/**
 * Pure aggregation for the monthly summary.
 *
 * Kept out of the route handler so the money maths is unit-testable without a
 * database, and so the API, the dashboard and the chat agent can never drift
 * into computing the same totals in three slightly different ways.
 *
 * `groupBehavior` (group key -> "income"|"expense"|"savings"|"debt"|"excluded")
 * comes from the dynamic taxonomy (lib/taxonomy.ts) — a group not present in
 * the map, or marked "excluded" (TRANSFER, BUSINESS, ...), never enters any
 * total. This is what used to be six named fields hardcoded to the six
 * original groups; it now works for any group Adrien creates later too.
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
  totalSavings: number;
  totalDebt: number;
  /** Money actually consumed: every group behaving as "expense". Excludes savings. */
  totalExpenses: number;
  /** Everything that left the account: expenses + savings + debt. */
  totalOutflow: number;
  balance: number;
  savingsRate: number;
  expenseRate: number;
  transactionCount: number;
}

export function aggregate(
  transactions: TxLite[],
  groupBehavior: Record<string, string>
): Totals {
  const byGroup: Record<string, number> = {};
  const byCategory: Record<string, number> = {};

  for (const t of transactions) {
    const amt = Number(t.amount);
    if (!Number.isFinite(amt)) continue;
    byGroup[t.group] = (byGroup[t.group] || 0) + amt;
    byCategory[t.category] = (byCategory[t.category] || 0) + amt;
  }

  let totalIncome = 0;
  let totalExpenses = 0;
  let totalSavings = 0;
  let totalDebt = 0;
  for (const [group, amt] of Object.entries(byGroup)) {
    switch (groupBehavior[group]) {
      case "income":
        totalIncome += amt;
        break;
      case "expense":
        totalExpenses += amt;
        break;
      case "savings":
        totalSavings += amt;
        break;
      case "debt":
        totalDebt += amt;
        break;
      // "excluded", or a group not in the map: counts nowhere.
    }
  }

  const totalOutflow = totalExpenses + totalSavings + totalDebt;

  return {
    byGroup,
    byCategory,
    totalIncome,
    totalSavings,
    totalDebt,
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
