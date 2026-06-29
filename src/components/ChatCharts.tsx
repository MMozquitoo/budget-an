"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { formatCurrency } from "@/lib/utils";

const MONTH_NAMES = [
  "Jan", "Fév", "Mar", "Avr", "Mai", "Juin",
  "Juil", "Août", "Sep", "Oct", "Nov", "Déc",
];

function formatMonth(key: string) {
  const [y, m] = key.split("-");
  return `${MONTH_NAMES[parseInt(m, 10) - 1]} ${y}`;
}

function MiniTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-lg text-xs">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex justify-between gap-4">
          <span style={{ color: p.color }}>{p.name}</span>
          <span className="font-medium">{formatCurrency(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

const PIE_COLORS = ["#6366f1", "#ec4899", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6"];

export function TrendsChart({ data }: { data: any[] }) {
  if (!Array.isArray(data) || data.length < 2) return null;
  const chartData = data.map((d) => ({
    name: formatMonth(d.month),
    Revenus: Math.round(d.income),
    Dépenses: Math.round(d.expenses),
    Épargne: Math.round(d.savings),
  }));

  return (
    <div className="my-3 rounded-xl border border-gray-100 bg-gray-50/50 p-3">
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
          <XAxis dataKey="name" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
          <Tooltip content={<MiniTooltip />} />
          <Bar dataKey="Revenus" fill="#10b981" radius={[3, 3, 0, 0]} />
          <Bar dataKey="Dépenses" fill="#ef4444" radius={[3, 3, 0, 0]} />
          <Bar dataKey="Épargne" fill="#6366f1" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function SummaryChart({ data }: { data: any }) {
  if (!data?.byGroup || !Array.isArray(data.byGroup)) return null;
  const pieData = data.byGroup
    .filter((g: any) => g.group !== "INCOME" && g.total > 0)
    .map((g: any) => ({ name: g.label, value: Math.round(g.total) }));

  if (pieData.length === 0) return null;

  return (
    <div className="my-3 rounded-xl border border-gray-100 bg-gray-50/50 p-3">
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={pieData}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={80}
            paddingAngle={2}
            dataKey="value"
            label={({ name, percent }: any) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
          >
            {pieData.map((_: any, i: number) => (
              <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(v: any) => formatCurrency(Number(v))} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function NetWorthChart({ data }: { data: any[] }) {
  if (!Array.isArray(data) || data.length < 2) return null;
  const chartData = data.map((d) => ({
    name: formatMonth(d.period),
    Patrimoine: Math.round(d.total),
  }));

  return (
    <div className="my-3 rounded-xl border border-gray-100 bg-gray-50/50 p-3">
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
          <defs>
            <linearGradient id="chatNetWorth" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="name" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
          <Tooltip content={<MiniTooltip />} />
          <Area
            type="monotone"
            dataKey="Patrimoine"
            stroke="#6366f1"
            strokeWidth={2}
            fill="url(#chatNetWorth)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
