"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LineChart,
  Line,
} from "recharts";
import { formatCurrency, GROUP_LABELS } from "@/lib/utils";

interface MonthData {
  year: number;
  month: number;
  byGroup: Record<string, number>;
  byCategory: Record<string, number>;
}

const MONTH_NAMES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

const GROUP_CHART_COLORS: Record<string, string> = {
  INCOME: "#10b981",
  FIXED_EXPENSE: "#3b82f6",
  VARIABLE_EXPENSE: "#f59e0b",
  SAVINGS: "#8b5cf6",
  DEBT: "#ef4444",
  UNEXPECTED: "#f97316",
};

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload) return null;
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-lg text-sm">
      <p className="font-medium text-gray-900 mb-1">{label}</p>
      {payload.map((entry: any) => (
        <div key={entry.name} className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-gray-500">{entry.name}:</span>
          <span className="font-medium">{formatCurrency(entry.value)}</span>
        </div>
      ))}
    </div>
  );
}

export function IncomeVsExpensesChart({ data }: { data: MonthData[] }) {
  const chartData = data.map((d) => ({
    name: `${MONTH_NAMES[d.month - 1]} ${d.year}`,
    Ingresos: d.byGroup["INCOME"] || 0,
    Gastos: (d.byGroup["FIXED_EXPENSE"] || 0) + (d.byGroup["VARIABLE_EXPENSE"] || 0) + (d.byGroup["UNEXPECTED"] || 0),
    Ahorro: d.byGroup["SAVINGS"] || 0,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="Ingresos" fill="#10b981" radius={[4, 4, 0, 0]} />
        <Bar dataKey="Gastos" fill="#ef4444" radius={[4, 4, 0, 0]} />
        <Bar dataKey="Ahorro" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function GroupTrendChart({ data }: { data: MonthData[] }) {
  const groups = ["FIXED_EXPENSE", "VARIABLE_EXPENSE", "SAVINGS", "DEBT", "UNEXPECTED"];

  const chartData = data.map((d) => {
    const point: Record<string, any> = {
      name: `${MONTH_NAMES[d.month - 1]} ${d.year}`,
    };
    for (const g of groups) {
      point[GROUP_LABELS[g]] = d.byGroup[g] || 0;
    }
    return point;
  });

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {groups.map((g) => (
          <Line
            key={g}
            type="monotone"
            dataKey={GROUP_LABELS[g]}
            stroke={GROUP_CHART_COLORS[g]}
            strokeWidth={2}
            dot={{ r: 3 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

export function CategoryTrendChart({ data, categories, labels }: {
  data: MonthData[];
  categories: string[];
  labels: Record<string, string>;
}) {
  const colors = ["#6366f1", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6", "#f97316", "#ec4899", "#14b8a6", "#3b82f6", "#84cc16"];

  const chartData = data.map((d) => {
    const point: Record<string, any> = {
      name: `${MONTH_NAMES[d.month - 1]} ${d.year}`,
    };
    for (const cat of categories) {
      point[labels[cat] || cat] = d.byCategory[cat] || 0;
    }
    return point;
  });

  const activeCats = categories.filter((cat) =>
    data.some((d) => (d.byCategory[cat] || 0) > 0)
  );

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {activeCats.map((cat, i) => (
          <Bar
            key={cat}
            dataKey={labels[cat] || cat}
            fill={colors[i % colors.length]}
            stackId="a"
            radius={i === activeCats.length - 1 ? [4, 4, 0, 0] : undefined}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
