"use client";

import { useRouter } from "next/navigation";
import { getMonthName, getCurrentYear } from "@/lib/utils";

export default function DashboardFilters({ month, year }: { month: number; year: number }) {
  const router = useRouter();

  return (
    <div className="flex gap-2">
      <select
        value={month}
        onChange={(e) => router.push(`/dashboard?month=${e.target.value}&year=${year}`)}
        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
      >
        {Array.from({ length: 12 }, (_, i) => (
          <option key={i + 1} value={i + 1}>
            {getMonthName(i + 1)}
          </option>
        ))}
      </select>
      <select
        value={year}
        onChange={(e) => router.push(`/dashboard?month=${month}&year=${e.target.value}`)}
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
  );
}
