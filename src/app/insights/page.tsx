import Link from "next/link";
import { formatCurrency, cn } from "@/lib/utils";
import { computeInsights } from "@/lib/insights-data";
import InsightsFilters from "./InsightsFilters";
import {
  Lightbulb,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  PiggyBank,
  ChevronRight,
} from "lucide-react";

interface Rec {
  type: string;
  severity: "high" | "medium" | "low";
  category?: string;
  title: string;
  detail: string;
  estimatedMonthly?: number;
}

const SEV: Record<Rec["severity"], { dot: string; chip: string; label: string }> = {
  high:   { dot: "bg-red-500",   chip: "bg-red-50 text-red-700",     label: "Priorité" },
  medium: { dot: "bg-amber-500", chip: "bg-amber-50 text-amber-700", label: "À voir" },
  low:    { dot: "bg-gray-400",  chip: "bg-gray-100 text-gray-600",  label: "Optionnel" },
};

export default async function InsightsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; year?: string }>;
}) {
  const sp = await searchParams;
  const monthArg = sp.month ? Number(sp.month) : null;
  const yearArg = sp.year ? Number(sp.year) : null;

  const data = await computeInsights(monthArg, yearArg, 6);
  const recommendations = data.recommendations as Rec[];

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analyse</h1>
          <p className="text-sm text-gray-500">
            Ce qui a bougé, et ce que je te recommande de faire.
          </p>
        </div>
        <InsightsFilters month={data.month} year={data.year} />
      </div>

      {/* Opportunity banner */}
      {data.totalOpportunity > 0 && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="rounded-lg bg-emerald-100 p-2">
            <Sparkles className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-sm text-emerald-700">Marge identifiée ce mois-ci</p>
            <p className="text-xl font-bold text-emerald-800">
              jusqu&apos;à {formatCurrency(data.totalOpportunity)} / mois
            </p>
          </div>
        </div>
      )}

      {/* Recommendations */}
      <div className="mb-8">
        <div className="mb-3 flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-indigo-600" />
          <h2 className="text-lg font-semibold text-gray-900">Recommandations</h2>
        </div>
        {recommendations.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-sm text-gray-500">
            Rien à signaler ce mois-ci. Tes budgets tiennent et aucune dépense atypique détectée.
          </div>
        ) : (
          <div className="space-y-3">
            {recommendations.map((r, i) => {
              const s = SEV[r.severity];
              return (
                <div key={i} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <span className={cn("mt-1.5 h-2 w-2 flex-shrink-0 rounded-full", s.dot)} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-gray-900">{r.title}</p>
                        <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", s.chip)}>
                          {s.label}
                        </span>
                        {r.estimatedMonthly ? (
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                            ~{formatCurrency(r.estimatedMonthly)}/mois
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm text-gray-500">{r.detail}</p>
                      {(r.type === "over_budget" || r.type === "unused_budget") && (
                        <Link
                          href="/budgets"
                          className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700"
                        >
                          Ajuster le budget <ChevronRight className="h-3 w-3" />
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Analyse */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Savings trend */}
        {data.savings && (
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <PiggyBank className="h-5 w-5 text-violet-600" />
              <h3 className="font-semibold text-gray-900">Taux d&apos;épargne</h3>
            </div>
            <div className="flex items-end gap-3">
              <span className="text-3xl font-bold text-gray-900">
                {data.savings.current.toFixed(0)}%
              </span>
              <span
                className={cn(
                  "mb-1 flex items-center text-sm font-medium",
                  data.savings.direction === "up"
                    ? "text-emerald-600"
                    : data.savings.direction === "down"
                      ? "text-red-600"
                      : "text-gray-400"
                )}
              >
                {data.savings.direction === "up" ? (
                  <ArrowUpRight className="h-4 w-4" />
                ) : data.savings.direction === "down" ? (
                  <ArrowDownRight className="h-4 w-4" />
                ) : null}
                {data.savings.deltaPts >= 0 ? "+" : ""}
                {data.savings.deltaPts.toFixed(0)} pts
              </span>
            </div>
            <p className="mt-2 text-xs text-gray-400">
              Mois précédent : {data.savings.previous.toFixed(0)}% · moyenne : {data.savings.average.toFixed(0)}%
            </p>
          </div>
        )}

        {/* Biggest movers */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="mb-3 font-semibold text-gray-900">Ce qui a le plus bougé</h3>
          {data.movements.length === 0 ? (
            <p className="text-sm text-gray-400">Rien de notable vs les mois précédents.</p>
          ) : (
            <div className="space-y-2.5">
              {data.movements.slice(0, 6).map((m) => (
                <div key={m.category} className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate text-gray-700">{m.label}</span>
                  <span className="flex items-center gap-2 whitespace-nowrap">
                    <span className="text-gray-400">
                      {formatCurrency(m.current)} vs {formatCurrency(m.average)}
                    </span>
                    <span
                      className={cn(
                        "flex items-center font-medium",
                        m.direction === "up" ? "text-red-600" : "text-emerald-600"
                      )}
                    >
                      {m.direction === "up" ? (
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      ) : (
                        <ArrowDownRight className="h-3.5 w-3.5" />
                      )}
                      {m.deltaPct >= 0 ? "+" : ""}
                      {m.deltaPct}%
                    </span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
