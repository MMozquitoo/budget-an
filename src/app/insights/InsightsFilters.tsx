"use client";

import { useRouter } from "next/navigation";

const MONTH_NAMES = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

export default function InsightsFilters({ month, year }: { month: number; year: number }) {
  const router = useRouter();

  return (
    <div className="flex items-center gap-2">
      <select
        value={month}
        onChange={(e) => router.push(`/insights?month=${e.target.value}&year=${year}`)}
        className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
      >
        {MONTH_NAMES.map((m, i) => (
          <option key={i} value={i + 1}>{m}</option>
        ))}
      </select>
      <input
        type="number"
        value={year}
        onChange={(e) => router.push(`/insights?month=${month}&year=${e.target.value}`)}
        className="w-24 rounded-lg border border-gray-300 px-3 py-2 text-sm"
      />
    </div>
  );
}
