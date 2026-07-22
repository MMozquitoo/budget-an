/**
 * Full logical export of the database.
 *
 * Every table is included, not just the ones the app still shows: the business
 * tables (business lines, revenue, decisions, wealth snapshots…) are no longer
 * surfaced anywhere, which makes them the *most* important to keep — that data
 * exists nowhere else.
 *
 * Prisma's Decimal serialises to a JSON string, so amounts survive the round
 * trip exactly; JSON.stringify would silently mangle a float.
 */

import { prisma } from "@/lib/prisma";

export const BACKUP_VERSION = 1;

export interface BackupFile {
  version: number;
  createdAt: string;
  counts: Record<string, number>;
  tables: Record<string, unknown[]>;
}

export async function buildBackup(now: Date = new Date()): Promise<BackupFile> {
  const [
    personalTransactions,
    classificationRules,
    netWorthSnapshots,
    householdExpenses,
    personalIncome,
    businessLines,
    revenues,
    businessExpenses,
    events,
    pipelineOpportunities,
    wealthSnapshots,
    timeEntries,
    decisions,
  ] = await Promise.all([
    prisma.personalTransaction.findMany({ orderBy: { date: "asc" } }),
    prisma.classificationRule.findMany(),
    prisma.netWorthSnapshot.findMany(),
    prisma.householdExpense.findMany(),
    prisma.personalIncome.findMany(),
    prisma.businessLine.findMany(),
    prisma.revenue.findMany(),
    prisma.businessExpense.findMany(),
    prisma.event.findMany(),
    prisma.pipelineOpportunity.findMany(),
    prisma.wealthSnapshot.findMany(),
    prisma.timeEntry.findMany(),
    prisma.decision.findMany(),
  ]);

  const tables: Record<string, unknown[]> = {
    personalTransactions,
    classificationRules,
    netWorthSnapshots,
    householdExpenses,
    personalIncome,
    businessLines,
    revenues,
    businessExpenses,
    events,
    pipelineOpportunities,
    wealthSnapshots,
    timeEntries,
    decisions,
  };

  const counts = Object.fromEntries(
    Object.entries(tables).map(([name, rows]) => [name, rows.length])
  );

  return {
    version: BACKUP_VERSION,
    createdAt: now.toISOString(),
    counts,
    tables,
  };
}

/** `backups/2026-07-22T19-30-00.json` — sorts chronologically as a string. */
export function backupPathname(now: Date = new Date()): string {
  return `backups/${now.toISOString().replace(/[:.]/g, "-").slice(0, 19)}.json`;
}

/**
 * A backup that lost a table would still look like a successful upload, so
 * refuse to store one that is obviously truncated. personal_transactions is the
 * table the whole app is built on: if it comes back empty, something is wrong
 * with the connection, not with the finances.
 */
export function assertPlausible(backup: BackupFile): void {
  if (backup.counts.personalTransactions === 0) {
    throw new Error(
      "Refusing to store a backup with zero personal transactions — likely a failed read, not an empty database"
    );
  }
}
