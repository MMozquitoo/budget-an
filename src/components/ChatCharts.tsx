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

/** The shape recharts hands a custom tooltip. */
interface TooltipPayloadItem {
  dataKey?: string | number;
  name?: string | number;
  value?: number;
  color?: string;
}

interface MiniTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string | number;
}

function MiniTooltip({ active, payload, label }: MiniTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-lg text-xs">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {payload.map((p) => (
        <div key={String(p.dataKey)} className="flex justify-between gap-4">
          <span style={{ color: p.color }}>{p.name}</span>
          <span className="font-medium">{formatCurrency(Number(p.value ?? 0))}</span>
        </div>
      ))}
    </div>
  );
}

const PIE_COLORS = ["#6366f1", "#ec4899", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6"];

/** Output of the agent's getTrends tool. */
export interface TrendPoint {
  month: string;
  income: number;
  expenses: number;
  savings: number;
}

export function TrendsChart({ data }: { data: TrendPoint[] }) {
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

/** Output of the agent's getSummary tool. */
export interface SummaryToolOutput {
  byGroup?: Array<{ group: string; label: string; total: number }>;
}

export function SummaryChart({ data }: { data: SummaryToolOutput }) {
  if (!data?.byGroup || !Array.isArray(data.byGroup)) return null;
  const pieData = data.byGroup
    .filter((g) => g.group !== "INCOME" && g.group !== "TRANSFER" && g.total > 0)
    .map((g) => ({ name: g.label, value: Math.round(g.total) }));

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
            label={({ name, percent }: { name?: string; percent?: number }) =>
              `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
            }
          >
            {pieData.map((_, i) => (
              <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(v) => formatCurrency(Number(v))} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Output of the agent's getNetWorth tool. */
export interface NetWorthPoint {
  period: string;
  total: number;
}

export function NetWorthChart({ data }: { data: NetWorthPoint[] }) {
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
