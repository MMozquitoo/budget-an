"use client";

import { useEffect, useState } from "react";
import { formatCurrency, cn } from "@/lib/utils";
import { CreditCard } from "lucide-react";

interface Account {
  account: string;
  income: number;
  outflow: number;
  net: number;
  count: number;
}

const COLORS = [
  "bg-indigo-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-violet-500",
  "bg-red-500",
  "bg-blue-500",
  "bg-pink-500",
];

/** Per-account spend for the dashboard — only shown when there is more than one account. */
export default function AccountBreakdownCard({
  month,
  year,
}: {
  month: number | null;
  year: number | null;
}) {
  const [accounts, setAccounts] = useState<Account[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (month === null || year === null) return;
    setLoading(true);
    fetch(`/api/accounts?month=${month}&year=${year}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setAccounts(d?.accounts ?? null))
      .catch(() => setAccounts(null))
      .finally(() => setLoading(false));
  }, [month, year]);

  if (loading || !accounts || accounts.length <= 1) return null;

  const max = Math.max(...accounts.map((a) => a.outflow), 1);

  return (
    <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <div className="rounded-lg bg-gray-100 p-2">
          <CreditCard className="h-5 w-5 text-gray-600" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900">Par compte</h2>
      </div>
      <div className="space-y-2.5">
        {accounts.map((a, i) => (
          <div key={a.account}>
            <div className="mb-1 flex items-center justify-between gap-2 text-xs">
              <span className="truncate text-gray-700">{a.account}</span>
              <span className="whitespace-nowrap text-gray-400">
                {formatCurrency(a.outflow)} · {a.count} op.
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className={cn("h-full rounded-full", COLORS[i % COLORS.length])}
                style={{ width: `${(a.outflow / max) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
