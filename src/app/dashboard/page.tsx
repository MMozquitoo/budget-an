import Link from "next/link";
import {
  ArrowUpRight,
  ArrowDownRight,
  ArrowLeftRight,
  Building2,
  Wallet,
  TrendingDown,
  PiggyBank,
  AlertTriangle,
  CreditCard,
  DollarSign,
  ChevronRight,
  Tag,
} from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";
import { getTaxonomy } from "@/lib/taxonomy";
import { IncomeVsExpensesChart, GroupTrendChart } from "@/components/TrendChart";
import ForecastCard from "@/components/ForecastCard";
import DashboardFilters from "./DashboardFilters";
import {
  getLatestMonth,
  getMonthSummary,
  getMonthlyTrends,
} from "@/lib/dashboard-data";
import { computeForecast } from "@/lib/forecast-data";

// month/year are optional in the URL (default to the latest month with data),
// so nothing here forces dynamic rendering on its own — without this, Next
// would prerender the dashboard once at build time (same issue caught on
// /net-worth).
export const dynamic = "force-dynamic";

const GROUP_ICONS: Record<string, typeof Wallet> = {
  INCOME: DollarSign,
  FIXED_EXPENSE: Wallet,
  VARIABLE_EXPENSE: TrendingDown,
  SAVINGS: PiggyBank,
  DEBT: CreditCard,
  UNEXPECTED: AlertTriangle,
  TRANSFER: ArrowLeftRight,
  BUSINESS: Building2,
};

/** A group Adrien creates via chat has no preset icon — fall back to a generic tag. */
function iconFor(group: string): typeof Wallet {
  return GROUP_ICONS[group] ?? Tag;
}

function deltaIcon(current: number, previous: number) {
  if (previous === 0) return null;
  const delta = current - previous;
  if (delta >= 0) {
    return (
      <span className="flex items-center text-xs font-medium text-emerald-600">
        <ArrowUpRight className="h-3 w-3" />
        {formatCurrency(Math.abs(delta))}
      </span>
    );
  }
  return (
    <span className="flex items-center text-xs font-medium text-red-600">
      <ArrowDownRight className="h-3 w-3" />
      {formatCurrency(Math.abs(delta))}
    </span>
  );
}

export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; year?: string }>;
}) {
  const sp = await searchParams;
  let month = sp.month ? Number(sp.month) : null;
  let year = sp.year ? Number(sp.year) : null;
  if (!month || !year) {
    const latest = await getLatestMonth();
    month = latest.month;
    year = latest.year;
  }

  const [data, trends, forecast, taxonomy] = await Promise.all([
    getMonthSummary(month, year),
    getMonthlyTrends(8),
    computeForecast(6, 6),
    getTaxonomy(),
  ]);

  const movimientosHref = (group?: string, category?: string) => {
    const params = new URLSearchParams();
    params.set("month", String(month));
    params.set("year", String(year));
    if (group) params.set("group", group);
    if (category) params.set("category", category);
    return `/household?${params.toString()}`;
  };

  const balanceColor = data.balance >= 0 ? "text-emerald-600" : "text-red-600";
  const balanceBg = data.balance >= 0 ? "bg-emerald-50" : "bg-red-50";

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mon Budget</h1>
          <p className="text-sm text-gray-500">
            Résumé financier personnel
          </p>
        </div>
        <DashboardFilters month={month} year={year} />
      </div>

      {/* Top KPIs */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-500">Revenus</span>
            <div className="rounded-lg bg-emerald-50 p-2">
              <DollarSign className="h-5 w-5 text-emerald-600" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-gray-900">
              {formatCurrency(data.totalIncome)}
            </span>
            <div className="mt-1">
              {deltaIcon(data.totalIncome, data.prevIncome)}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-500">Dépenses</span>
            <div className="rounded-lg bg-red-50 p-2">
              <TrendingDown className="h-5 w-5 text-red-600" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-gray-900">
              {formatCurrency(data.totalExpenses)}
            </span>
            <p className="mt-1 text-xs text-gray-400">
              {data.expenseRate.toFixed(0)}% des revenus
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-500">Épargne</span>
            <div className="rounded-lg bg-violet-50 p-2">
              <PiggyBank className="h-5 w-5 text-violet-600" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-gray-900">
              {formatCurrency(data.totalSavings)}
            </span>
            <p className="mt-1 text-xs text-gray-400">
              Taux : {data.savingsRate.toFixed(0)}%
            </p>
          </div>
        </div>

        <div className={cn("rounded-xl border p-6 shadow-sm", balanceBg, data.balance >= 0 ? "border-emerald-200" : "border-red-200")}>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-500">Solde</span>
            <div className={cn("rounded-lg p-2", balanceBg)}>
              <Wallet className={cn("h-5 w-5", balanceColor)} />
            </div>
          </div>
          <div className="mt-3">
            <span className={cn("text-2xl font-bold", balanceColor)}>
              {formatCurrency(data.balance)}
            </span>
            <p className="mt-1 text-xs text-gray-400">
              Revenus - Total des sorties
            </p>
          </div>
        </div>
      </div>

      {/* Trend Charts */}
      {trends && trends.length > 1 && (
        <div className="mb-6 grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              Entrées vs Sorties
            </h2>
            <IncomeVsExpensesChart data={trends} />
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              Évolution par groupe
            </h2>
            <GroupTrendChart data={trends} groupLabels={taxonomy.groupLabels} />
          </div>
        </div>
      )}

      <ForecastCard data={forecast} />

      {/* Group breakdown cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {taxonomy.groupOrder.map((group) => {
          const colors = taxonomy.groupColors[group];
          const Icon = iconFor(group);
          const total = data.byGroup[group] || 0;
          const categories = taxonomy.categoriesByGroup[group];
          const pct = data.totalIncome > 0 ? (total / data.totalIncome) * 100 : 0;

          return (
            <div
              key={group}
              className={cn("rounded-xl border bg-white p-6 shadow-sm", colors.border)}
            >
              <Link
                href={movimientosHref(group)}
                className="flex w-full items-center justify-between mb-4 group/header"
              >
                <div className="flex items-center gap-2">
                  <div className={cn("rounded-lg p-2", colors.bg)}>
                    <Icon className={cn("h-4 w-4", colors.text)} />
                  </div>
                  <span className="text-sm font-semibold text-gray-900">
                    {taxonomy.groupLabels[group]}
                  </span>
                  <ChevronRight className="h-4 w-4 text-gray-300 group-hover/header:text-indigo-500 transition-colors" />
                </div>
                <span className="text-lg font-bold text-gray-900">
                  {formatCurrency(total)}
                </span>
              </Link>

              {taxonomy.groupBehavior[group] !== "income" && taxonomy.groupBehavior[group] !== "excluded" && data.totalIncome > 0 && (
                <div className="mb-4">
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>{pct.toFixed(0)}% des revenus</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-gray-100">
                    <div
                      className={cn("h-2 rounded-full transition-all", colors.dot)}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1">
                {categories.map((cat) => {
                  const catAmt = data.byCategory[cat] || 0;
                  if (catAmt === 0) return null;
                  const catPct = total > 0 ? (catAmt / total) * 100 : 0;
                  return (
                    <Link
                      key={cat}
                      href={movimientosHref(group, cat)}
                      className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-sm hover:bg-gray-50 transition-colors group/cat"
                    >
                      <div className="flex items-center gap-2">
                        <div className={cn("h-1.5 w-1.5 rounded-full", colors.dot)} />
                        <span className="text-gray-500 group-hover/cat:text-gray-900">
                          {taxonomy.categoryLabels[cat]}
                        </span>
                        <span className="text-xs text-gray-300">
                          {catPct.toFixed(0)}%
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="font-medium text-gray-700">
                          {formatCurrency(catAmt)}
                        </span>
                        <ChevronRight className="h-3 w-3 text-gray-200 group-hover/cat:text-indigo-500 transition-colors" />
                      </div>
                    </Link>
                  );
                })}
                {categories.every((cat) => !(data.byCategory[cat])) && (
                  <p className="text-xs text-gray-300 italic px-2">Aucune opération</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {data.transactionCount === 0 && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-12 text-center">
          <Wallet className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-4 text-lg font-semibold text-gray-600">
            Aucune opération ce mois
          </h3>
          <p className="mt-2 text-sm text-gray-400">
            Va sur <a href="/household" className="text-indigo-600 underline">Détails</a> pour ajouter tes revenus et dépenses.
          </p>
        </div>
      )}
    </div>
  );
}
