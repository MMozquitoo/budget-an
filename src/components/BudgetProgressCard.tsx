import Link from "next/link";
import { Wallet, ChevronRight } from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";

interface Line {
  category: string;
  budget: number;
  actual: number;
  pct: number;
  health: string;
  direction: string;
}
interface Report {
  lines: Line[];
  overCount: number;
  totalBudget: number;
  totalActual: number;
}

const BAR: Record<string, string> = {
  ok: "bg-emerald-500",
  warning: "bg-amber-500",
  over: "bg-red-500",
  met: "bg-emerald-500",
  close: "bg-amber-500",
  behind: "bg-violet-400",
};

/** Compact budget progress for the dashboard — links out to the full /budgets page. */
export default function BudgetProgressCard({
  report,
  categoryLabels,
}: {
  report: Report | null;
  categoryLabels: Record<string, string>;
}) {
  if (!report) return null;

  const top = [...report.lines].sort((a, b) => b.pct - a.pct).slice(0, 5);

  return (
    <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-indigo-50 p-2">
            <Wallet className="h-5 w-5 text-indigo-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">Budgets du mois</h2>
        </div>
        <Link
          href="/budgets"
          className="flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-700"
        >
          Gérer <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      {report.lines.length === 0 ? (
        <p className="text-sm text-gray-500">
          Aucun budget défini pour ce mois.{" "}
          <Link href="/budgets" className="font-medium text-indigo-600 hover:underline">
            En créer
          </Link>
          .
        </p>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
            <span className="text-gray-500">
              Total :{" "}
              <span className="font-semibold text-gray-900">{formatCurrency(report.totalActual)}</span>{" "}
              / {formatCurrency(report.totalBudget)}
            </span>
            {report.overCount > 0 && (
              <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600">
                {report.overCount} dépassé{report.overCount > 1 ? "s" : ""}
              </span>
            )}
          </div>
          <div className="space-y-2.5">
            {top.map((l) => (
              <div key={l.category}>
                <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                  <span className="truncate text-gray-600">
                    {categoryLabels[l.category] || l.category}
                  </span>
                  <span className="whitespace-nowrap text-gray-400">
                    {formatCurrency(l.actual)} / {formatCurrency(l.budget)}
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                  <div
                    className={cn("h-full rounded-full", BAR[l.health] || "bg-gray-400")}
                    style={{ width: `${Math.min(l.pct, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
