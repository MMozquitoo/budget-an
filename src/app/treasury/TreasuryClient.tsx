"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { formatCurrency, cn } from "@/lib/utils";
import { Plus, Trash2, TrendingUp, TrendingDown, Wallet } from "lucide-react";
import type { CashSnapshotRow } from "@/lib/treasury-data";
import type { TreasuryStats } from "@/lib/treasury";

const MONTH_NAMES = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];

function formatDelta(amount: number | null, pct: number | null) {
  if (amount === null) return "n/d";
  const sign = amount >= 0 ? "+" : "";
  const pctText = pct === null ? "" : ` / ${sign}${pct.toFixed(1)} %`;
  return `${sign}${formatCurrency(amount)}${pctText}`;
}

function DeltaIcon({ amount }: { amount: number | null }) {
  if (amount === null) return null;
  return amount >= 0 ? (
    <TrendingUp className="h-4 w-4 text-emerald-500" />
  ) : (
    <TrendingDown className="h-4 w-4 text-red-500" />
  );
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) {
  if (!active || !payload?.[0]) return null;
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-lg text-sm">
      <p className="font-semibold text-gray-900">{label}</p>
      <p className="text-gray-600">{formatCurrency(payload[0].value)}</p>
    </div>
  );
}

export default function TreasuryClient({
  snapshots,
  stats,
}: {
  snapshots: CashSnapshotRow[];
  stats: TreasuryStats<CashSnapshotRow>;
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    amount: "",
    notes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/treasury", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        month: form.month,
        year: form.year,
        amount: Number(form.amount) || 0,
        notes: form.notes || null,
      }),
    });
    setShowForm(false);
    setForm({ month: new Date().getMonth() + 1, year: new Date().getFullYear(), amount: "", notes: "" });
    router.refresh();
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/treasury?id=${id}`, { method: "DELETE" });
    router.refresh();
  };

  const chartData = stats.chart.map((s) => ({
    name: `${MONTH_NAMES[s.month - 1]} ${s.year}`,
    amount: s.amount,
  }));

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Trésorerie</h1>
          <p className="text-sm text-gray-500">
            Cash réellement disponible — comptes courants + livrets, hors patrimoine et placements
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" />
          Ajouter un mois
        </button>
      </div>

      {/* KPI */}
      {stats.current ? (
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="flex items-center gap-1.5 text-sm text-gray-500">
              <Wallet className="h-4 w-4" />
              Trésorerie ({MONTH_NAMES[stats.current.month - 1]} {stats.current.year})
            </p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.current.amount)}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">vs mois précédent</p>
            <div className="flex items-center gap-2">
              <DeltaIcon amount={stats.vsPreviousMonth.amount} />
              <p
                className={cn(
                  "text-xl font-bold",
                  stats.vsPreviousMonth.amount === null
                    ? "text-gray-400"
                    : stats.vsPreviousMonth.amount >= 0
                      ? "text-emerald-600"
                      : "text-red-600"
                )}
              >
                {formatDelta(stats.vsPreviousMonth.amount, stats.vsPreviousMonth.pct)}
              </p>
            </div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">vs il y a 3 mois</p>
            <div className="flex items-center gap-2">
              <DeltaIcon amount={stats.vsThreeMonthsAgo.amount} />
              <p
                className={cn(
                  "text-xl font-bold",
                  stats.vsThreeMonthsAgo.amount === null
                    ? "text-gray-400"
                    : stats.vsThreeMonthsAgo.amount >= 0
                      ? "text-emerald-600"
                      : "text-red-600"
                )}
              >
                {formatDelta(stats.vsThreeMonthsAgo.amount, stats.vsThreeMonthsAgo.pct)}
              </p>
            </div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Tendance (3 derniers mois)</p>
            <p
              className={cn(
                "text-xl font-bold",
                stats.monthlyTrend === null
                  ? "text-gray-400"
                  : stats.monthlyTrend >= 0
                    ? "text-emerald-600"
                    : "text-red-600"
              )}
            >
              {stats.monthlyTrend === null
                ? "n/d"
                : `${stats.monthlyTrend >= 0 ? "+" : ""}${formatCurrency(stats.monthlyTrend)}/mois`}
            </p>
          </div>
        </div>
      ) : (
        <div className="mb-6 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-12 text-center">
          <Wallet className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-4 text-lg font-semibold text-gray-600">Aucun snapshot de trésorerie</h3>
          <p className="mt-2 text-sm text-gray-400">
            Ajoute ton premier relevé mensuel pour commencer à suivre ta trésorerie.
          </p>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">Enregistrer un relevé mensuel</h3>
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Mois</label>
              <select
                value={form.month}
                onChange={(e) => setForm({ ...form, month: Number(e.target.value) })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                {MONTH_NAMES.map((m, i) => (
                  <option key={i} value={i + 1}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Année</label>
              <input
                type="number"
                value={form.year}
                onChange={(e) => setForm({ ...form, year: Number(e.target.value) })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Trésorerie (€)</label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Notes</label>
              <input
                type="text"
                placeholder="Optionnel"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="sm:col-span-4 flex gap-3">
              <button
                type="submit"
                className="rounded-lg bg-indigo-600 px-6 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              >
                Enregistrer
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-lg border border-gray-300 px-6 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Annuler
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Chart */}
      {chartData.length >= 2 && (
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-1 text-lg font-semibold text-gray-900">Derniers mois</h2>
          <p className="mb-4 text-xs text-gray-400">Trésorerie disponible, fin de mois</p>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="amount"
                stroke="#10b981"
                strokeWidth={2.5}
                dot={{ r: 4, fill: "#10b981" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Table */}
      {snapshots.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium text-gray-500">Période</th>
                  <th className="px-4 py-3 font-medium text-gray-500 text-right">Trésorerie</th>
                  <th className="px-4 py-3 font-medium text-gray-500">Notes</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {[...snapshots].reverse().map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {MONTH_NAMES[s.month - 1]} {s.year}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">
                      {formatCurrency(s.amount)}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{s.notes ?? ""}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDelete(s.id)}
                        className="rounded p-1 text-gray-300 hover:text-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
