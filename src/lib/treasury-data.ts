/**
 * Orchestration for the short-term treasury view: reads/writes CashSnapshot
 * and runs the pure stats engine. Shared by /api/treasury, the /treasury
 * Server Component, and the agent's setCashSnapshot tool.
 */

import { prisma } from "@/lib/prisma";
import { computeTreasuryStats, type CashSnapshotPoint } from "@/lib/treasury";

export interface CashSnapshotRow extends CashSnapshotPoint {
  id: string;
  notes: string | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toRow(s: { id: string; month: number; year: number; amount: any; notes: string | null }): CashSnapshotRow {
  return { id: s.id, month: s.month, year: s.year, amount: Number(s.amount), notes: s.notes };
}

export async function getTreasuryData() {
  const rows = await prisma.cashSnapshot.findMany({
    orderBy: [{ year: "asc" }, { month: "asc" }],
  });
  const snapshots = rows.map(toRow);
  return { snapshots, stats: computeTreasuryStats(snapshots) };
}

export async function upsertCashSnapshot(input: {
  month: number;
  year: number;
  amount: number;
  notes?: string | null;
}): Promise<CashSnapshotRow> {
  const s = await prisma.cashSnapshot.upsert({
    where: { month_year: { month: input.month, year: input.year } },
    update: { amount: input.amount, notes: input.notes ?? null },
    create: { month: input.month, year: input.year, amount: input.amount, notes: input.notes ?? null },
  });
  return toRow(s);
}

export async function deleteCashSnapshot(id: string): Promise<void> {
  await prisma.cashSnapshot.delete({ where: { id } });
}
