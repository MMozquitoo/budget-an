"use client";

import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  ArrowDownRight,
  Shield,
  Briefcase,
  Users,
  TrendingUp,
} from "lucide-react";
import {
  formatCurrency,
  formatPercent,
  formatHours,
  getCurrentMonth,
  getCurrentYear,
  getMonthName,
  cn,
  BUSINESS_LINE_COLORS,
} from "@/lib/utils";

interface RevenueByLine {
  name: string;
  revenue: number;
  hours: number;
  euroPerHour: number;
  color: string;
}

interface FreedomData {
  personalBurn: number;
  businessRevenue: number;
  businessExpenses: number;
  businessExpensesReal: number;
  ownerDraws: number;
  butterflyMargin: number;
  taxReserveRate: number;
  taxReserveRequired: number;
  revenueAfterTax: number;
  businessCash: number;
  personalCash: number;
  netWorth: number;
  previousNetWorth: number | null;
  runwayPersonalMonths: number | null;
  runwayBusinessMonths: number | null;
  avgPersonalBurn: number;
  avgBusinessBurn: number;
  rollingMonths: number;
  topClientPct: number;
  topClientName: string;
  pipelineTotal: number;
  pipelineWeighted: number;
  revenueByLine: RevenueByLine[];
  hasRealBalances: boolean;
}

function runwayColor(months: number | null): string {
  if (months === null) return "text-gray-400";
  if (months >= 12) return "text-green-600";
  if (months >= 6) return "text-yellow-600";
  return "text-red-600";
}

function runwayBg(months: number | null): string {
  if (months === null) return "bg-gray-50";
  if (months >= 12) return "bg-green-50";
  if (months >= 6) return "bg-yellow-50";
  return "bg-red-50";
}

function clientColor(pct: number): string {
  if (pct > 50) return "text-red-600";
  if (pct > 30) return "text-yellow-600";
  return "text-green-600";
}

function clientBg(pct: number): string {
  if (pct > 50) return "bg-red-50";
  if (pct > 30) return "bg-yellow-50";
  return "bg-green-50";
}

export default function FreedomDashboard() {
  const [data, setData] = useState<FreedomData | null>(null);
  const [month, setMonth] = useState<number | null>(null);
  const [year, setYear] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (month === null || year === null) {
      fetch("/api/freedom/latest")
        .then((r) => r.json())
        .then((d) => {
          setMonth(d.month || getCurrentMonth());
          setYear(d.year || getCurrentYear());
        });
      return;
    }
    setLoading(true);
    fetch(`/api/freedom?month=${month}&year=${year}`)
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [month, year]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  if (!data) return null;

  const personalMonths = data.runwayPersonalMonths;
  const businessMonths = data.runwayBusinessMonths;
  const netWorthDelta =
    data.previousNetWorth !== null ? data.netWorth - data.previousNetWorth : null;

  const revenueByLine = [...data.revenueByLine].sort(
    (a, b) => b.euroPerHour - a.euroPerHour
  );
  const totals = revenueByLine.reduce(
    (acc, l) => ({
      revenue: acc.revenue + l.revenue,
      hours: acc.hours + l.hours,
    }),
    { revenue: 0, hours: 0 }
  );

  const pipelinePct =
    data.pipelineTotal > 0
      ? (data.pipelineWeighted / data.pipelineTotal) * 100
      : 0;

  return (
    <div>
      {/* Balance warning */}
      {!data.hasRealBalances && (
        <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <strong>No real balances.</strong> Runway and net worth need manual balance entry in{" "}
          <a href="/wealth" className="underline font-medium">Wealth</a>.
          Cash flow data (burn, revenue, margins) is accurate.
        </div>
      )}

      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Freedom</h1>
          <p className="text-sm text-gray-500">
            Am I freer than 12 months ago?
          </p>
        </div>
        <div className="flex gap-2">
          <select
            value={month ?? getCurrentMonth()}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
          >
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {getMonthName(i + 1)}
              </option>
            ))}
          </select>
          <select
            value={year ?? getCurrentYear()}
            onChange={(e) => setYear(Number(e.target.value))}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
          >
            {Array.from({ length: 5 }, (_, i) => {
              const y = getCurrentYear() - 2 + i;
              return (
                <option key={y} value={y}>
                  {y}
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {/* Row 1: 4 KPI Cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Personal Runway */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-500">
              Personal Runway
            </span>
            <div className={cn("rounded-lg p-2", runwayBg(personalMonths))}>
              <Shield
                className={cn("h-5 w-5", runwayColor(personalMonths))}
              />
            </div>
          </div>
          <div className="mt-3">
            <span
              className={cn("text-2xl font-bold", runwayColor(personalMonths))}
            >
              {personalMonths !== null
                ? `${personalMonths.toFixed(1)} months`
                : "N/A"}
            </span>
          </div>
        </div>

        {/* Business Runway */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-500">
              Business Runway
            </span>
            <div className={cn("rounded-lg p-2", runwayBg(businessMonths))}>
              <Briefcase
                className={cn("h-5 w-5", runwayColor(businessMonths))}
              />
            </div>
          </div>
          <div className="mt-3">
            <span
              className={cn(
                "text-2xl font-bold",
                runwayColor(businessMonths)
              )}
            >
              {businessMonths !== null
                ? `${businessMonths.toFixed(1)} months`
                : "N/A"}
            </span>
          </div>
        </div>

        {/* Top Client */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-500">
              Top Client
            </span>
            <div className={cn("rounded-lg p-2", clientBg(data.topClientPct))}>
              <Users
                className={cn("h-5 w-5", clientColor(data.topClientPct))}
              />
            </div>
          </div>
          <div className="mt-3">
            <span
              className={cn(
                "text-2xl font-bold",
                clientColor(data.topClientPct)
              )}
            >
              {formatPercent(data.topClientPct)}
            </span>
            <p className="mt-1 truncate text-sm text-gray-500">
              {data.topClientName || "No clients"}
            </p>
          </div>
        </div>

        {/* Net Worth */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-500">
              Net Worth
            </span>
            <div className="rounded-lg bg-indigo-50 p-2">
              <TrendingUp className="h-5 w-5 text-indigo-600" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-gray-900">
              {formatCurrency(data.netWorth)}
            </span>
            {netWorthDelta !== null && (
              <span
                className={cn(
                  "flex items-center text-sm font-medium",
                  netWorthDelta >= 0 ? "text-green-600" : "text-red-600"
                )}
              >
                {netWorthDelta >= 0 ? (
                  <ArrowUpRight className="h-4 w-4" />
                ) : (
                  <ArrowDownRight className="h-4 w-4" />
                )}
                {formatCurrency(Math.abs(netWorthDelta))}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Row 2: Revenue + Pipeline */}
      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        {/* Revenue per Business Line */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Revenue per Business Line
          </h2>
          {revenueByLine.length === 0 ? (
            <p className="text-sm text-gray-400">
              No revenue recorded this month
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-gray-500">
                    <th className="pb-3 font-medium">Activity</th>
                    <th className="pb-3 text-right font-medium">Revenue</th>
                    <th className="pb-3 text-right font-medium">Hours</th>
                    <th className="pb-3 text-right font-medium">&euro;/Hour</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {revenueByLine.map((line) => (
                    <tr key={line.name}>
                      <td className="py-3 text-gray-900">
                        <span className="flex items-center gap-2">
                          <span
                            className="inline-block h-2.5 w-2.5 rounded-full"
                            style={{
                              backgroundColor:
                                BUSINESS_LINE_COLORS[line.name] || line.color,
                            }}
                          />
                          {line.name}
                        </span>
                      </td>
                      <td className="py-3 text-right text-gray-900">
                        {formatCurrency(line.revenue)}
                      </td>
                      <td className="py-3 text-right text-gray-500">
                        {formatHours(line.hours)}
                      </td>
                      <td className="py-3 text-right font-medium text-indigo-600">
                        {formatCurrency(Math.round(line.euroPerHour))}
                      </td>
                    </tr>
                  ))}
                  {/* Total row */}
                  <tr className="border-t border-gray-200 font-medium">
                    <td className="py-3 text-gray-900">Total</td>
                    <td className="py-3 text-right text-gray-900">
                      {formatCurrency(totals.revenue)}
                    </td>
                    <td className="py-3 text-right text-gray-500">
                      {formatHours(totals.hours)}
                    </td>
                    <td className="py-3 text-right text-indigo-600">
                      {totals.hours > 0
                        ? formatCurrency(
                            Math.round(totals.revenue / totals.hours)
                          )
                        : "-"}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pipeline — Bug 8: label clarifying it's forward-looking, not month-filtered */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-1 text-lg font-semibold text-gray-900">
            Pipeline (all open)
          </h2>
          <p className="mb-4 text-xs text-gray-400">
            Forward-looking — not filtered by selected month
          </p>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-500">Total Pipeline</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(data.pipelineTotal)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Weighted Pipeline</p>
              <p className="text-2xl font-bold text-indigo-600">
                {formatCurrency(data.pipelineWeighted)}
              </p>
            </div>
            {/* Visual bar */}
            <div className="mt-2">
              <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                <span>Weighted</span>
                <span>{pipelinePct.toFixed(0)}% of total</span>
              </div>
              <div className="h-4 w-full rounded-full bg-gray-100">
                <div
                  className="h-4 rounded-full bg-indigo-600 transition-all"
                  style={{ width: `${Math.min(pipelinePct, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: Tax Reserve — FIX 2 */}
      <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Tax Reserve Estimate
          </h2>
          <span className="rounded-full bg-amber-200 px-3 py-1 text-xs font-medium text-amber-800">
            Placeholder {(data.taxReserveRate * 100).toFixed(0)}% — needs expert-comptable
          </span>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg bg-white p-4">
            <p className="text-sm text-gray-500">Revenue (gross)</p>
            <p className="mt-1 text-xl font-bold text-gray-900">
              {formatCurrency(data.businessRevenue)}
            </p>
          </div>
          <div className="rounded-lg bg-white p-4">
            <p className="text-sm text-amber-600">Tax holdback</p>
            <p className="mt-1 text-xl font-bold text-amber-700">
              {formatCurrency(data.taxReserveRequired)}
            </p>
          </div>
          <div className="rounded-lg bg-white p-4">
            <p className="text-sm text-green-600">Available after tax</p>
            <p className="mt-1 text-xl font-bold text-green-700">
              {formatCurrency(data.revenueAfterTax)}
            </p>
          </div>
        </div>
      </div>

      {/* Row 4: Monthly Burn — Enhanced with owner draws + rolling avg */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Monthly Burn</h2>
          <span className="text-xs text-gray-400">
            Runway uses {data.rollingMonths}-month rolling avg
          </span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg bg-gray-50 p-4">
            <p className="text-sm text-gray-500">Personal burn</p>
            <p className="mt-1 text-xl font-bold text-gray-900">
              {formatCurrency(data.personalBurn)}
            </p>
            <p className="mt-1 text-xs text-gray-400">
              Avg: {formatCurrency(data.avgPersonalBurn)}/mo
            </p>
          </div>
          <div className="rounded-lg bg-gray-50 p-4">
            <p className="text-sm text-gray-500">Business expenses</p>
            <p className="mt-1 text-xl font-bold text-gray-900">
              {formatCurrency(data.businessExpensesReal)}
            </p>
            <p className="mt-1 text-xs text-gray-400">
              Avg: {formatCurrency(data.avgBusinessBurn)}/mo
            </p>
          </div>
          <div className="rounded-lg bg-orange-50 p-4">
            <p className="text-sm text-orange-600">Owner draws</p>
            <p className="mt-1 text-xl font-bold text-orange-700">
              {formatCurrency(data.ownerDraws)}
            </p>
            <p className="mt-1 text-xs text-orange-400">
              Personal spending on business card
            </p>
          </div>
          <div className="rounded-lg bg-indigo-50 p-4">
            <p className="text-sm text-indigo-600">Butterfly margin</p>
            <p className={cn(
              "mt-1 text-xl font-bold",
              data.butterflyMargin >= 0 ? "text-green-700" : "text-red-700"
            )}>
              {formatCurrency(data.butterflyMargin)}
            </p>
            <p className="mt-1 text-xs text-gray-400">
              Revenue minus real biz costs
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
