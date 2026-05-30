"use client";

import { useEffect, useState } from "react";
import {
  formatCurrency,
  getMonthName,
  getCurrentMonth,
  getCurrentYear,
  formatPercent,
} from "@/lib/utils";

interface WealthSnapshot {
  id: string;
  month: number;
  year: number;
  cashPersonal: number;
  cashBusiness: number;
  emergencyFund: number;
  investments: number;
  debt: number;
  butterflyValue: number;
}

function netWorth(s: WealthSnapshot): number {
  return (
    s.cashPersonal +
    s.cashBusiness +
    s.emergencyFund +
    s.investments +
    s.butterflyValue -
    s.debt
  );
}

function totalAssets(s: WealthSnapshot): number {
  return (
    s.cashPersonal +
    s.cashBusiness +
    s.emergencyFund +
    s.investments +
    s.butterflyValue
  );
}

export default function WealthPage() {
  const [snapshots, setSnapshots] = useState<WealthSnapshot[]>([]);
  const [loading, setLoading] = useState(true);

  const [formMonth, setFormMonth] = useState(getCurrentMonth());
  const [formYear, setFormYear] = useState(getCurrentYear());
  const [formCashPersonal, setFormCashPersonal] = useState("");
  const [formCashBusiness, setFormCashBusiness] = useState("");
  const [formEmergencyFund, setFormEmergencyFund] = useState("");
  const [formInvestments, setFormInvestments] = useState("");
  const [formDebt, setFormDebt] = useState("");
  const [formButterflyValue, setFormButterflyValue] = useState("");
  const [saving, setSaving] = useState(false);

  function fetchSnapshots() {
    setLoading(true);
    fetch("/api/wealth-snapshots")
      .then((r) => { if (!r.ok) throw new Error("API error"); return r.json(); })
      .then(setSnapshots)
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchSnapshots();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/wealth-snapshots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        month: formMonth,
        year: formYear,
        cashPersonal: Number(formCashPersonal) || 0,
        cashBusiness: Number(formCashBusiness) || 0,
        emergencyFund: Number(formEmergencyFund) || 0,
        investments: Number(formInvestments) || 0,
        debt: Number(formDebt) || 0,
        butterflyValue: Number(formButterflyValue) || 0,
      }),
    });
    setSaving(false);
    setFormCashPersonal("");
    setFormCashBusiness("");
    setFormEmergencyFund("");
    setFormInvestments("");
    setFormDebt("");
    setFormButterflyValue("");
    fetchSnapshots();
  }

  const current = snapshots[0] ?? null;
  const previous = snapshots[1] ?? null;

  const currentNW = current ? netWorth(current) : 0;
  const previousNW = previous ? netWorth(previous) : 0;
  const nwChange = currentNW - previousNW;
  const nwChangePct = previousNW !== 0 ? (nwChange / Math.abs(previousNW)) * 100 : 0;

  const currentAssets = current ? totalAssets(current) : 0;
  const currentLiabilities = current ? current.debt : 0;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Wealth</h1>
        <p className="text-sm text-gray-500">The scoreboard</p>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
        </div>
      ) : (
        <>
          {/* Hero Net Worth */}
          <div className="mb-6 rounded-xl bg-indigo-600 p-8 text-white shadow-sm">
            <p className="text-sm font-medium text-indigo-200">Current Net Worth</p>
            <p className="mt-1 text-4xl font-bold">{formatCurrency(currentNW)}</p>
            {previous && (
              <div className="mt-2 flex items-center gap-2 text-sm">
                <span
                  className={
                    nwChange >= 0
                      ? "text-green-300"
                      : "text-red-300"
                  }
                >
                  {nwChange >= 0 ? "↑" : "↓"}{" "}
                  {formatCurrency(Math.abs(nwChange))} ({formatPercent(Math.abs(nwChangePct))})
                </span>
                <span className="text-indigo-300">vs previous month</span>
              </div>
            )}
          </div>

          {/* Balance Sheet */}
          <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Balance Sheet</h2>
            <div className="grid gap-6 md:grid-cols-2">
              {/* Assets */}
              <div>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-green-600">
                  Assets
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Cash Personal</span>
                    <span className="text-gray-900">
                      {formatCurrency(current?.cashPersonal ?? 0)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Cash Business</span>
                    <span className="text-gray-900">
                      {formatCurrency(current?.cashBusiness ?? 0)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Emergency Fund</span>
                    <span className="text-gray-900">
                      {formatCurrency(current?.emergencyFund ?? 0)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Investments</span>
                    <span className="text-gray-900">
                      {formatCurrency(current?.investments ?? 0)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Butterfly Value</span>
                    <span className="text-gray-900">
                      {formatCurrency(current?.butterflyValue ?? 0)}
                    </span>
                  </div>
                  <div className="mt-2 border-t border-gray-200 pt-2">
                    <div className="flex justify-between text-sm font-bold">
                      <span className="text-green-700">Total Assets</span>
                      <span className="text-green-700">
                        {formatCurrency(currentAssets)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Liabilities */}
              <div>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-red-600">
                  Liabilities
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Debt</span>
                    <span className="text-gray-900">
                      {formatCurrency(currentLiabilities)}
                    </span>
                  </div>
                  <div className="mt-2 border-t border-gray-200 pt-2">
                    <div className="flex justify-between text-sm font-bold">
                      <span className="text-red-700">Total Liabilities</span>
                      <span className="text-red-700">
                        {formatCurrency(currentLiabilities)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 border-t border-gray-200 pt-4">
              <div className="flex justify-between text-lg font-bold">
                <span className="text-gray-900">Net Worth = Total Assets - Total Liabilities</span>
                <span className="text-indigo-600">{formatCurrency(currentNW)}</span>
              </div>
            </div>
          </div>

          {/* Snapshot Form */}
          <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Monthly Snapshot</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Month</label>
                  <select
                    value={formMonth}
                    onChange={(e) => setFormMonth(Number(e.target.value))}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                  >
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {getMonthName(i + 1)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Year</label>
                  <select
                    value={formYear}
                    onChange={(e) => setFormYear(Number(e.target.value))}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
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

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Cash Personal
                  </label>
                  <input
                    type="number"
                    value={formCashPersonal}
                    onChange={(e) => setFormCashPersonal(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Cash Business
                  </label>
                  <input
                    type="number"
                    value={formCashBusiness}
                    onChange={(e) => setFormCashBusiness(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Emergency Fund
                  </label>
                  <input
                    type="number"
                    value={formEmergencyFund}
                    onChange={(e) => setFormEmergencyFund(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Investments
                  </label>
                  <input
                    type="number"
                    value={formInvestments}
                    onChange={(e) => setFormInvestments(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Debt</label>
                  <input
                    type="number"
                    value={formDebt}
                    onChange={(e) => setFormDebt(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Butterfly Value
                  </label>
                  <input
                    type="number"
                    value={formButterflyValue}
                    onChange={(e) => setFormButterflyValue(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    placeholder="0"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Snapshot"}
              </button>
            </form>
          </div>

          {/* History Table */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">History</h2>
            {snapshots.length === 0 ? (
              <p className="text-sm text-gray-400">No snapshots yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-left text-gray-500">
                      <th className="pb-3 font-medium">Month/Year</th>
                      <th className="pb-3 text-right font-medium">Cash Personal</th>
                      <th className="pb-3 text-right font-medium">Cash Business</th>
                      <th className="pb-3 text-right font-medium">Emergency</th>
                      <th className="pb-3 text-right font-medium">Investments</th>
                      <th className="pb-3 text-right font-medium">Butterfly</th>
                      <th className="pb-3 text-right font-medium">Debt</th>
                      <th className="pb-3 text-right font-medium">Net Worth</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {snapshots.map((s, idx) => {
                      const nw = netWorth(s);
                      const prev = snapshots[idx + 1];
                      const prevNW = prev ? netWorth(prev) : null;
                      const trend =
                        prevNW !== null
                          ? nw > prevNW
                            ? "up"
                            : nw < prevNW
                              ? "down"
                              : "flat"
                          : null;
                      return (
                        <tr key={s.id}>
                          <td className="py-2.5 text-gray-900">
                            {getMonthName(s.month)} {s.year}
                          </td>
                          <td className="py-2.5 text-right text-gray-700">
                            {formatCurrency(s.cashPersonal)}
                          </td>
                          <td className="py-2.5 text-right text-gray-700">
                            {formatCurrency(s.cashBusiness)}
                          </td>
                          <td className="py-2.5 text-right text-gray-700">
                            {formatCurrency(s.emergencyFund)}
                          </td>
                          <td className="py-2.5 text-right text-gray-700">
                            {formatCurrency(s.investments)}
                          </td>
                          <td className="py-2.5 text-right text-gray-700">
                            {formatCurrency(s.butterflyValue)}
                          </td>
                          <td className="py-2.5 text-right text-red-600">
                            {formatCurrency(s.debt)}
                          </td>
                          <td className="py-2.5 text-right font-medium">
                            <span className="flex items-center justify-end gap-1">
                              {trend === "up" && (
                                <span className="text-green-500">{"↑"}</span>
                              )}
                              {trend === "down" && (
                                <span className="text-red-500">{"↓"}</span>
                              )}
                              <span
                                className={
                                  nw >= 0 ? "text-green-700" : "text-red-700"
                                }
                              >
                                {formatCurrency(nw)}
                              </span>
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
