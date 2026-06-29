"use client";

import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import { formatCurrency, cn } from "@/lib/utils";
import { Plus, Trash2, TrendingUp, TrendingDown } from "lucide-react";

interface Snapshot {
  id: string;
  month: number;
  year: number;
  cash: number;
  savings: number;
  investments: number;
  property: number;
  debt: number;
  total: number;
  notes?: string;
}

const MONTH_NAMES = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-lg text-sm">
      <p className="font-semibold text-gray-900 mb-2">{label}</p>
      <div className="space-y-1">
        <div className="flex justify-between gap-6">
          <span className="text-gray-500">Efectivo</span>
          <span className="font-medium">{formatCurrency(d.cash)}</span>
        </div>
        <div className="flex justify-between gap-6">
          <span className="text-gray-500">Ahorro</span>
          <span className="font-medium">{formatCurrency(d.savings)}</span>
        </div>
        <div className="flex justify-between gap-6">
          <span className="text-gray-500">Inversiones</span>
          <span className="font-medium">{formatCurrency(d.investments)}</span>
        </div>
        <div className="flex justify-between gap-6">
          <span className="text-gray-500">Propiedad</span>
          <span className="font-medium">{formatCurrency(d.property)}</span>
        </div>
        <div className="flex justify-between gap-6 text-red-600">
          <span>Deudas</span>
          <span className="font-medium">-{formatCurrency(d.debt)}</span>
        </div>
        <div className="border-t border-gray-100 pt-1 flex justify-between gap-6 font-semibold">
          <span className="text-gray-900">Total</span>
          <span className={d.total >= 0 ? "text-emerald-600" : "text-red-600"}>
            {formatCurrency(d.total)}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function NetWorthPage() {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    cash: "",
    savings: "",
    investments: "",
    property: "",
    debt: "",
    notes: "",
  });

  const fetchData = () => {
    setLoading(true);
    fetch("/api/net-worth")
      .then((r) => r.json())
      .then(setSnapshots)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/net-worth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        month: form.month,
        year: form.year,
        cash: Number(form.cash) || 0,
        savings: Number(form.savings) || 0,
        investments: Number(form.investments) || 0,
        property: Number(form.property) || 0,
        debt: Number(form.debt) || 0,
        notes: form.notes || null,
      }),
    });
    setShowForm(false);
    setForm({ month: new Date().getMonth() + 1, year: new Date().getFullYear(), cash: "", savings: "", investments: "", property: "", debt: "", notes: "" });
    fetchData();
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/net-worth?id=${id}`, { method: "DELETE" });
    fetchData();
  };

  const chartData = snapshots.map((s) => ({
    name: `${MONTH_NAMES[s.month - 1]} ${s.year}`,
    ...s,
  }));

  const latest = snapshots[snapshots.length - 1];
  const prev = snapshots[snapshots.length - 2];
  const change = latest && prev ? latest.total - prev.total : 0;

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Patrimonio neto</h1>
          <p className="text-sm text-gray-500">
            Evolución de tus activos y deudas
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" />
          Agregar mes
        </button>
      </div>

      {/* KPI */}
      {latest && (
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Patrimonio actual</p>
            <p className={cn("text-2xl font-bold", latest.total >= 0 ? "text-emerald-600" : "text-red-600")}>
              {formatCurrency(latest.total)}
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Cambio vs mes anterior</p>
            <div className="flex items-center gap-2">
              {change >= 0 ? (
                <TrendingUp className="h-5 w-5 text-emerald-500" />
              ) : (
                <TrendingDown className="h-5 w-5 text-red-500" />
              )}
              <p className={cn("text-2xl font-bold", change >= 0 ? "text-emerald-600" : "text-red-600")}>
                {change >= 0 ? "+" : ""}{formatCurrency(change)}
              </p>
            </div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Deuda total</p>
            <p className="text-2xl font-bold text-red-600">
              {formatCurrency(latest.debt)}
            </p>
          </div>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">
            Registrar snapshot mensual
          </h3>
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Mes</label>
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
              <label className="block text-xs font-medium text-gray-500 mb-1">Año</label>
              <input
                type="number"
                value={form.year}
                onChange={(e) => setForm({ ...form, year: Number(e.target.value) })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Efectivo</label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={form.cash}
                onChange={(e) => setForm({ ...form, cash: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Ahorro</label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={form.savings}
                onChange={(e) => setForm({ ...form, savings: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Inversiones</label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={form.investments}
                onChange={(e) => setForm({ ...form, investments: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Propiedad</label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={form.property}
                onChange={(e) => setForm({ ...form, property: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Deudas</label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={form.debt}
                onChange={(e) => setForm({ ...form, debt: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Notas</label>
              <input
                type="text"
                placeholder="Opcional"
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
                Guardar
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-lg border border-gray-300 px-6 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Chart */}
      {chartData.length >= 2 && (
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Evolución del patrimonio
          </h2>
          <ResponsiveContainer width="100%" height={350}>
            <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
              <defs>
                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="total"
                stroke="#6366f1"
                strokeWidth={3}
                fill="url(#colorTotal)"
              />
            </AreaChart>
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
                  <th className="px-4 py-3 font-medium text-gray-500">Periodo</th>
                  <th className="px-4 py-3 font-medium text-gray-500 text-right">Efectivo</th>
                  <th className="px-4 py-3 font-medium text-gray-500 text-right">Ahorro</th>
                  <th className="px-4 py-3 font-medium text-gray-500 text-right">Inversiones</th>
                  <th className="px-4 py-3 font-medium text-gray-500 text-right">Propiedad</th>
                  <th className="px-4 py-3 font-medium text-gray-500 text-right">Deudas</th>
                  <th className="px-4 py-3 font-medium text-gray-500 text-right">Total</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {[...snapshots].reverse().map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {MONTH_NAMES[s.month - 1]} {s.year}
                    </td>
                    <td className="px-4 py-3 text-right">{formatCurrency(s.cash)}</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(s.savings)}</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(s.investments)}</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(s.property)}</td>
                    <td className="px-4 py-3 text-right text-red-600">{formatCurrency(s.debt)}</td>
                    <td className={cn("px-4 py-3 text-right font-semibold", s.total >= 0 ? "text-emerald-600" : "text-red-600")}>
                      {formatCurrency(s.total)}
                    </td>
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

      {snapshots.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-12 text-center">
          <TrendingUp className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-4 text-lg font-semibold text-gray-600">
            Sin datos de patrimonio
          </h3>
          <p className="mt-2 text-sm text-gray-400">
            Agrega tu primer snapshot mensual para comenzar a trackear tu patrimonio.
          </p>
        </div>
      )}
    </div>
  );
}
