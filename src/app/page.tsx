"use client";

import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  TrendingDown,
  PiggyBank,
  AlertTriangle,
  CreditCard,
  DollarSign,
} from "lucide-react";
import {
  formatCurrency,
  getCurrentMonth,
  getCurrentYear,
  getMonthName,
  cn,
  GROUP_LABELS,
  GROUP_COLORS,
  CATEGORY_LABELS,
  CATEGORIES_BY_GROUP,
  GROUP_ORDER,
} from "@/lib/utils";

interface SummaryData {
  month: number;
  year: number;
  totalIncome: number;
  totalFixedExpense: number;
  totalVariableExpense: number;
  totalSavings: number;
  totalDebt: number;
  totalUnexpected: number;
  totalExpenses: number;
  totalOutflow: number;
  balance: number;
  savingsRate: number;
  expenseRate: number;
  prevIncome: number;
  prevExpenses: number;
  byGroup: Record<string, number>;
  byCategory: Record<string, number>;
  transactionCount: number;
}

const GROUP_ICONS: Record<string, typeof Wallet> = {
  INCOME: DollarSign,
  FIXED_EXPENSE: Wallet,
  VARIABLE_EXPENSE: TrendingDown,
  SAVINGS: PiggyBank,
  DEBT: CreditCard,
  UNEXPECTED: AlertTriangle,
};

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

export default function Dashboard() {
  const [data, setData] = useState<SummaryData | null>(null);
  const [month, setMonth] = useState<number | null>(null);
  const [year, setYear] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (month === null || year === null) {
      fetch("/api/transactions/latest")
        .then((r) => r.json())
        .then((d) => {
          setMonth(d.month);
          setYear(d.year);
        })
        .catch(() => {
          setMonth(getCurrentMonth());
          setYear(getCurrentYear());
        });
      return;
    }
    setLoading(true);
    setError(null);
    fetch(`/api/transactions/summary?month=${month}&year=${year}`)
      .then((r) => {
        if (!r.ok) throw new Error("API error");
        return r.json();
      })
      .then(setData)
      .catch(() => setError("No se pudo conectar a la base de datos."))
      .finally(() => setLoading(false));
  }, [month, year]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-6 py-20">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-8 text-center max-w-lg">
          <h2 className="text-lg font-semibold text-amber-800 mb-2">Sin conexión</h2>
          <p className="text-sm text-amber-700">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const balanceColor = data.balance >= 0 ? "text-emerald-600" : "text-red-600";
  const balanceBg = data.balance >= 0 ? "bg-emerald-50" : "bg-red-50";

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mi Presupuesto</h1>
          <p className="text-sm text-gray-500">
            Resumen financiero personal
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

      {/* Top KPIs */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Ingresos */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-500">Ingresos</span>
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

        {/* Gastos totales */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-500">Gastos</span>
            <div className="rounded-lg bg-red-50 p-2">
              <TrendingDown className="h-5 w-5 text-red-600" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-gray-900">
              {formatCurrency(data.totalExpenses)}
            </span>
            <p className="mt-1 text-xs text-gray-400">
              {data.expenseRate.toFixed(0)}% del ingreso
            </p>
          </div>
        </div>

        {/* Ahorro */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-500">Ahorro</span>
            <div className="rounded-lg bg-violet-50 p-2">
              <PiggyBank className="h-5 w-5 text-violet-600" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-gray-900">
              {formatCurrency(data.totalSavings)}
            </span>
            <p className="mt-1 text-xs text-gray-400">
              Tasa: {data.savingsRate.toFixed(0)}%
            </p>
          </div>
        </div>

        {/* Balance */}
        <div className={cn("rounded-xl border p-6 shadow-sm", balanceBg, data.balance >= 0 ? "border-emerald-200" : "border-red-200")}>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-500">Balance</span>
            <div className={cn("rounded-lg p-2", balanceBg)}>
              <Wallet className={cn("h-5 w-5", balanceColor)} />
            </div>
          </div>
          <div className="mt-3">
            <span className={cn("text-2xl font-bold", balanceColor)}>
              {formatCurrency(data.balance)}
            </span>
            <p className="mt-1 text-xs text-gray-400">
              Ingreso - Todo lo que sale
            </p>
          </div>
        </div>
      </div>

      {/* Group breakdown cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {GROUP_ORDER.map((group) => {
          const colors = GROUP_COLORS[group];
          const Icon = GROUP_ICONS[group];
          const total = data.byGroup[group] || 0;
          const categories = CATEGORIES_BY_GROUP[group];
          const pct = data.totalIncome > 0 ? (total / data.totalIncome) * 100 : 0;

          return (
            <div
              key={group}
              className={cn("rounded-xl border bg-white p-6 shadow-sm", colors.border)}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className={cn("rounded-lg p-2", colors.bg)}>
                    <Icon className={cn("h-4 w-4", colors.text)} />
                  </div>
                  <span className="text-sm font-semibold text-gray-900">
                    {GROUP_LABELS[group]}
                  </span>
                </div>
                <span className="text-lg font-bold text-gray-900">
                  {formatCurrency(total)}
                </span>
              </div>

              {/* Progress bar relative to income */}
              {group !== "INCOME" && data.totalIncome > 0 && (
                <div className="mb-4">
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>{pct.toFixed(0)}% del ingreso</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-gray-100">
                    <div
                      className={cn("h-2 rounded-full transition-all", colors.dot)}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Category detail */}
              <div className="space-y-1.5">
                {categories.map((cat) => {
                  const catAmt = data.byCategory[cat] || 0;
                  if (catAmt === 0) return null;
                  return (
                    <div key={cat} className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">{CATEGORY_LABELS[cat]}</span>
                      <span className="font-medium text-gray-700">
                        {formatCurrency(catAmt)}
                      </span>
                    </div>
                  );
                })}
                {categories.every((cat) => !(data.byCategory[cat])) && (
                  <p className="text-xs text-gray-300 italic">Sin movimientos</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty state */}
      {data.transactionCount === 0 && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-12 text-center">
          <Wallet className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-4 text-lg font-semibold text-gray-600">
            No hay movimientos este mes
          </h3>
          <p className="mt-2 text-sm text-gray-400">
            Ve a <a href="/household" className="text-indigo-600 underline">Movimientos</a> para agregar tus ingresos y gastos.
          </p>
        </div>
      )}
    </div>
  );
}
