import Link from "next/link";
import {
  formatCurrency,
  formatCurrencyDecimal,
  cn,
  GROUP_COLORS,
  CATEGORY_LABELS,
} from "@/lib/utils";
import type { RecurringSeries } from "@/lib/recurring";
import { getRecurringData } from "@/lib/recurring-data";
import { Repeat, Calendar, TrendingUp, ArrowUpRight, ArrowDownRight, PauseCircle } from "lucide-react";

const CADENCE_LABELS: Record<string, string> = {
  MONTHLY: "mensuel",
  QUARTERLY: "trimestriel",
  YEARLY: "annuel",
  IRREGULAR: "irrégulier",
};

export default async function SubscriptionsPage({
  searchParams,
}: {
  searchParams: Promise<{ all?: string }>;
}) {
  const { all } = await searchParams;
  const showInactive = all === "true";
  const { series, summary } = await getRecurringData(18, showInactive);

  const byCategory = series.reduce((acc, s) => {
    (acc[s.category] ||= []).push(s);
    return acc;
  }, {} as Record<string, RecurringSeries[]>);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Abonnements</h1>
        <p className="text-sm text-gray-500">
          Détectés automatiquement à partir de tes relevés — cadence, montant et
          hausses de prix
        </p>
      </div>

      {/* Summary cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-50 p-2">
              <Repeat className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Abonnements actifs</p>
              <p className="text-2xl font-bold text-gray-900">{summary.count}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-red-50 p-2">
              <Calendar className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Coût mensuel</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(summary.monthlyTotal)}
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-amber-50 p-2">
              <TrendingUp className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Projection annuelle</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(summary.yearlyTotal)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {(summary.priceIncreases > 0 || summary.inactiveCount > 0) && (
        <div className="mb-6 flex flex-wrap items-center gap-3 text-sm">
          {summary.priceIncreases > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 font-medium text-amber-700">
              <ArrowUpRight className="h-3.5 w-3.5" />
              {summary.priceIncreases} hausse{summary.priceIncreases > 1 ? "s" : ""} de prix
            </span>
          )}
          {summary.inactiveCount > 0 && (
            <Link
              href={`/subscriptions?all=${showInactive ? "false" : "true"}`}
              className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 font-medium text-gray-600 transition-colors hover:bg-gray-200"
            >
              <PauseCircle className="h-3.5 w-3.5" />
              {showInactive ? "Masquer" : "Afficher"} {summary.inactiveCount} inactif
              {summary.inactiveCount > 1 ? "s" : ""}
            </Link>
          )}
        </div>
      )}

      {series.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-12 text-center">
          <Repeat className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-4 text-lg font-semibold text-gray-600">
            Aucun abonnement détecté
          </h3>
          <p className="mt-2 text-sm text-gray-400">
            Il faut au moins trois prélèvements du même émetteur pour détecter un
            abonnement.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(byCategory)
            .sort(
              ([, a], [, b]) =>
                b.reduce((s, x) => s + x.monthlyEquivalent, 0) -
                a.reduce((s, x) => s + x.monthlyEquivalent, 0)
            )
            .map(([category, items]) => {
              const catTotal = items.reduce((s, x) => s + x.monthlyEquivalent, 0);
              const group = items[0]?.group || "FIXED_EXPENSE";
              const colors = GROUP_COLORS[group] || GROUP_COLORS.FIXED_EXPENSE;

              return (
                <div
                  key={category}
                  className="rounded-xl border border-gray-200 bg-white shadow-sm"
                >
                  <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                    <div className="flex items-center gap-3">
                      <span
                        className={cn(
                          "rounded-full px-3 py-1 text-xs font-medium",
                          colors.bg,
                          colors.text
                        )}
                      >
                        {CATEGORY_LABELS[category] || category}
                      </span>
                      <span className="text-sm text-gray-400">
                        {items.length} service{items.length > 1 ? "s" : ""}
                      </span>
                    </div>
                    <span className="font-semibold text-gray-900">
                      {formatCurrency(catTotal)}/mois
                    </span>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {items.map((s) => (
                      <div
                        key={s.key}
                        className="flex items-start justify-between gap-4 px-6 py-3"
                      >
                        <div className="min-w-0">
                          <p className={cn(
                            "text-sm font-medium",
                            s.active ? "text-gray-700" : "text-gray-400 line-through"
                          )}>
                            {s.description}
                          </p>
                          <p className="mt-0.5 text-xs text-gray-400">
                            {CADENCE_LABELS[s.cadence]} · {s.occurrences} prélèvements ·
                            dernier le{" "}
                            {new Date(s.lastDate).toLocaleDateString("fr-FR", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </p>
                          {s.priceChange && (
                            <p
                              className={cn(
                                "mt-1 inline-flex items-center gap-1 text-xs font-medium",
                                s.priceChange.pct > 0 ? "text-red-600" : "text-emerald-600"
                              )}
                            >
                              {s.priceChange.pct > 0 ? (
                                <ArrowUpRight className="h-3 w-3" />
                              ) : (
                                <ArrowDownRight className="h-3 w-3" />
                              )}
                              {formatCurrencyDecimal(s.priceChange.from)} →{" "}
                              {formatCurrencyDecimal(s.priceChange.to)} (
                              {s.priceChange.pct > 0 ? "+" : ""}
                              {s.priceChange.pct.toFixed(0)}%)
                            </p>
                          )}
                        </div>
                        <div className="shrink-0 text-right">
                          <span className="text-sm font-medium text-gray-900">
                            {formatCurrencyDecimal(s.amount)}
                          </span>
                          {s.cadence !== "MONTHLY" && (
                            <p className="text-xs text-gray-400">
                              {formatCurrencyDecimal(s.monthlyEquivalent)}/mois
                            </p>
                          )}
                          {s.variableAmount && (
                            <p className="text-xs text-gray-400">montant variable</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
