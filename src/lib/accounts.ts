/**
 * Multi-account support. The bank import packs the source account into the
 * `notes` field as "{account} | {category} > {subcategory}" (see
 * scripts/import-bank.ts). That account name was captured on every imported row
 * but never surfaced. These pure helpers parse it back out and break a month
 * down by account/card. Database-free and unit-testable.
 */

/** Extract the account name from a `notes` string, or null if absent. */
export function parseAccount(notes: string | null | undefined): string | null {
  if (!notes) return null;
  const idx = notes.indexOf(" | ");
  if (idx === -1) return null;
  const account = notes.slice(0, idx).trim();
  return account.length ? account : null;
}

export interface AccountTotals {
  account: string;
  income: number;
  outflow: number; // everything that left the account (expenses + savings + debt)
  net: number; // income - outflow
  count: number;
}

/**
 * Group transactions by their source account. Rows with no parseable account
 * fall under "Autre". Sorted by outflow, largest first. `groupBehavior`
 * (group key -> "income"|"expense"|"savings"|"debt"|"excluded", from the
 * dynamic taxonomy — lib/taxonomy.ts) drives income vs outflow the same way
 * `summary.ts aggregate()` does. "Excluded" groups (TRANSFER, ...) count
 * toward `count` but not income/outflow — money moving between Adrien's own
 * accounts is neither. BUSINESS is the one bespoke exception: MCAN's own
 * cash flow is real, so — unlike a plain excluded group — it still splits
 * into income/outflow, by category rather than group.
 */
export function accountBreakdown(
  transactions: Array<{ notes: string | null; group: string; category: string; amount: number }>,
  groupBehavior: Record<string, string>
): AccountTotals[] {
  const map = new Map<string, AccountTotals>();
  for (const t of transactions) {
    const account = parseAccount(t.notes) ?? "Autre";
    let a = map.get(account);
    if (!a) {
      a = { account, income: 0, outflow: 0, net: 0, count: 0 };
      map.set(account, a);
    }
    const amt = Number(t.amount);
    if (!Number.isFinite(amt)) continue;
    if (groupBehavior[t.group] === "income") a.income += amt;
    else if (t.group === "BUSINESS") {
      if (t.category === "BUSINESS_INCOME") a.income += amt;
      else a.outflow += amt;
    } else if (groupBehavior[t.group] === "excluded") { /* no-op */ }
    else a.outflow += amt;
    a.count += 1;
  }
  for (const a of map.values()) a.net = a.income - a.outflow;
  return [...map.values()].sort((x, y) => y.outflow - x.outflow);
}
