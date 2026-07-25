"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  formatCurrency,
  getMonthName,
  cn,
  GROUP_COLORS,
  GROUP_LABELS,
  CATEGORY_LABELS,
} from "@/lib/utils";

interface Transaction {
  id: string;
  date: string;
  amount: number;
  group: string;
  category: string;
  description: string;
}

function shiftMonthYear(month: number, year: number, delta: number) {
  const m = month + delta;
  if (m < 1) return { month: 12, year: year - 1 };
  if (m > 12) return { month: 1, year: year + 1 };
  return { month: m, year };
}

export default function CalendarClient({
  transactions,
  month,
  year,
}: {
  transactions: Transaction[];
  month: number;
  year: number;
}) {
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay();
  const adjustedFirstDay = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

  const byDay: Record<number, Transaction[]> = {};
  for (const t of transactions) {
    const day = new Date(t.date).getDate();
    if (!byDay[day]) byDay[day] = [];
    byDay[day].push(t);
  }

  const dayTotal = (day: number) =>
    (byDay[day] || []).reduce((sum, t) => sum + (t.group === "INCOME" ? t.amount : -t.amount), 0);

  const selectedTransactions = selectedDay ? byDay[selectedDay] || [] : [];

  const prev = shiftMonthYear(month, year, -1);
  const next = shiftMonthYear(month, year, 1);

  const WEEKDAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Calendar */}
      <div className="lg:col-span-2 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <Link
            href={`/calendar?month=${prev.month}&year=${prev.year}`}
            className="rounded-lg p-2 hover:bg-gray-100"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <h2 className="text-lg font-semibold text-gray-900">
            {getMonthName(month)} {year}
          </h2>
          <Link
            href={`/calendar?month=${next.month}&year=${next.year}`}
            className="rounded-lg p-2 hover:bg-gray-100"
          >
            <ChevronRight className="h-5 w-5" />
          </Link>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {WEEKDAYS.map((d) => (
            <div key={d} className="py-2 text-center text-xs font-medium text-gray-400">
              {d}
            </div>
          ))}
          {Array.from({ length: adjustedFirstDay }, (_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const txns = byDay[day] || [];
            const total = dayTotal(day);
            const hasIncome = txns.some((t) => t.group === "INCOME");
            const hasExpense = txns.some((t) => t.group !== "INCOME");

            return (
              <button
                key={day}
                onClick={() => setSelectedDay(selectedDay === day ? null : day)}
                className={cn(
                  "relative rounded-lg p-2 text-left transition-all min-h-[70px]",
                  selectedDay === day
                    ? "bg-indigo-50 ring-2 ring-indigo-500"
                    : txns.length > 0
                    ? "bg-gray-50 hover:bg-gray-100"
                    : "hover:bg-gray-50"
                )}
              >
                <span className={cn(
                  "text-sm font-medium",
                  selectedDay === day ? "text-indigo-700" : "text-gray-700"
                )}>
                  {day}
                </span>
                {txns.length > 0 && (
                  <div className="mt-1">
                    <div className="flex gap-0.5 mb-1">
                      {hasIncome && <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />}
                      {hasExpense && <div className="h-1.5 w-1.5 rounded-full bg-red-400" />}
                    </div>
                    <p className={cn(
                      "text-xs font-medium",
                      total >= 0 ? "text-emerald-600" : "text-red-500"
                    )}>
                      {total >= 0 ? "+" : ""}{formatCurrency(total)}
                    </p>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Day detail */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {selectedDay
            ? `${selectedDay} ${getMonthName(month)}`
            : "Sélectionne un jour"}
        </h3>

        {!selectedDay ? (
          <p className="text-sm text-gray-400">
            Clique sur un jour du calendrier pour voir ses opérations
          </p>
        ) : selectedTransactions.length === 0 ? (
          <p className="text-sm text-gray-400">Aucune opération ce jour</p>
        ) : (
          <div className="space-y-3">
            {selectedTransactions.map((t) => {
              const colors = GROUP_COLORS[t.group] || GROUP_COLORS.VARIABLE_EXPENSE;
              return (
                <div key={t.id} className="rounded-lg border border-gray-100 p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className={cn(
                      "text-sm font-medium",
                      t.group === "INCOME" ? "text-emerald-600" : "text-gray-900"
                    )}>
                      {t.group === "INCOME" ? "+" : "-"}{formatCurrency(t.amount)}
                    </span>
                    <span className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-medium",
                      colors.bg, colors.text
                    )}>
                      {GROUP_LABELS[t.group]}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 truncate">{t.description}</p>
                  <p className="text-xs text-gray-400">{CATEGORY_LABELS[t.category]}</p>
                </div>
              );
            })}
            <div className="border-t border-gray-100 pt-3">
              <div className="flex justify-between text-sm font-medium">
                <span className="text-gray-500">Total du jour</span>
                <span className={cn(
                  dayTotal(selectedDay) >= 0 ? "text-emerald-600" : "text-red-600"
                )}>
                  {formatCurrency(dayTotal(selectedDay))}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
