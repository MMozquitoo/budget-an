"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import {
  formatCurrency,
  getCurrentMonth,
  getCurrentYear,
  getMonthName,
  cn,
  HOUSEHOLD_LABELS,
} from "@/lib/utils";

interface HouseholdExpense {
  id: string;
  date: string;
  amount: number;
  category: string;
  description: string;
}

const CATEGORIES = Object.keys(HOUSEHOLD_LABELS) as string[];

const CATEGORY_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  FIXED: { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500" },
  VARIABLE: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" },
  FAMILY_TRAVEL: { bg: "bg-purple-50", text: "text-purple-700", dot: "bg-purple-500" },
  NICOLAS: { bg: "bg-teal-50", text: "text-teal-700", dot: "bg-teal-500" },
};

function burnColor(total: number): string {
  if (total < 4000) return "text-green-600";
  if (total <= 5000) return "text-yellow-600";
  return "text-red-600";
}

export default function HouseholdPage() {
  const [expenses, setExpenses] = useState<HouseholdExpense[]>([]);
  const [month, setMonth] = useState(10);
  const [year, setYear] = useState(2025);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [formDate, setFormDate] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formCategory, setFormCategory] = useState(CATEGORIES[0]);
  const [formDescription, setFormDescription] = useState("");

  const fetchExpenses = () => {
    setLoading(true);
    fetch(`/api/household-expenses?month=${month}&year=${year}`)
      .then((r) => r.json())
      .then(setExpenses)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchExpenses();
  }, [month, year]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/household-expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: formDate,
          amount: Number(formAmount),
          category: formCategory,
          description: formDescription,
        }),
      });
      if (res.ok) {
        setFormDate("");
        setFormAmount("");
        setFormCategory(CATEGORIES[0]);
        setFormDescription("");
        setShowForm(false);
        fetchExpenses();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/household-expenses?id=${id}`, { method: "DELETE" });
    fetchExpenses();
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  const total = expenses.reduce((sum, e) => sum + e.amount, 0);

  const byCategory = CATEGORIES.map((cat) => {
    const catTotal = expenses
      .filter((e) => e.category === cat)
      .reduce((sum, e) => sum + e.amount, 0);
    return {
      category: cat,
      label: HOUSEHOLD_LABELS[cat] || cat,
      total: catTotal,
      percent: total > 0 ? (catTotal / total) * 100 : 0,
    };
  });

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Household</h1>
          <p className="text-sm text-gray-500">
            Is our cost of life compatible with the freedom we want?
          </p>
        </div>
        <div className="flex gap-2">
          <select
            value={month}
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
            value={year}
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

      {/* Top KPI: Monthly Burn Rate */}
      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-8 shadow-sm text-center">
        <p className="text-sm font-medium text-gray-500">Monthly Burn Rate</p>
        <p className={cn("mt-2 text-4xl font-bold", burnColor(total))}>
          {formatCurrency(total)}
        </p>
        <p className="mt-1 text-sm text-gray-400">
          {getMonthName(month)} {year}
        </p>
      </div>

      {/* Category Cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {byCategory.map((cat) => {
          const colors = CATEGORY_COLORS[cat.category] || CATEGORY_COLORS.FIXED;
          return (
            <div
              key={cat.category}
              className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
            >
              <div className="flex items-center gap-2">
                <span className={cn("h-3 w-3 rounded-full", colors.dot)} />
                <span className="text-sm font-medium text-gray-500">
                  {cat.label}
                </span>
              </div>
              <p className="mt-3 text-2xl font-bold text-gray-900">
                {formatCurrency(cat.total)}
              </p>
              <p className="mt-1 text-sm text-gray-400">
                {cat.percent.toFixed(1)}% of total
              </p>
            </div>
          );
        })}
      </div>

      {/* Expense List + Add Form */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Expenses</h2>
          <button
            onClick={() => setShowForm(!showForm)}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              showForm
                ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                : "bg-indigo-600 text-white hover:bg-indigo-700"
            )}
          >
            {showForm ? (
              <>
                <X className="h-4 w-4" /> Cancel
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" /> Add Expense
              </>
            )}
          </button>
        </div>

        {/* Add Form */}
        {showForm && (
          <form
            onSubmit={handleAdd}
            className="mb-6 rounded-lg border border-gray-100 bg-gray-50 p-4"
          >
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Date
                </label>
                <input
                  type="date"
                  required
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Amount
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Category
                </label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {HOUSEHOLD_LABELS[cat]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Description
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Rent"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {submitting ? "Adding..." : "Add Expense"}
              </button>
            </div>
          </form>
        )}

        {/* Expense Table */}
        {expenses.length === 0 ? (
          <p className="text-sm text-gray-400">No expenses this month</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-gray-500">
                  <th className="pb-3 font-medium">Date</th>
                  <th className="pb-3 font-medium">Description</th>
                  <th className="pb-3 font-medium">Category</th>
                  <th className="pb-3 text-right font-medium">Amount</th>
                  <th className="pb-3 text-right font-medium">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {expenses.map((exp) => {
                  const colors =
                    CATEGORY_COLORS[exp.category] || CATEGORY_COLORS.FIXED;
                  return (
                    <tr key={exp.id}>
                      <td className="py-3 text-gray-500">
                        {new Date(exp.date).toLocaleDateString("en", {
                          day: "numeric",
                          month: "short",
                        })}
                      </td>
                      <td className="py-3 text-gray-900">{exp.description}</td>
                      <td className="py-3">
                        <span
                          className={cn(
                            "inline-block rounded-full px-2.5 py-0.5 text-xs font-medium",
                            colors.bg,
                            colors.text
                          )}
                        >
                          {HOUSEHOLD_LABELS[exp.category] || exp.category}
                        </span>
                      </td>
                      <td className="py-3 text-right font-medium text-gray-900">
                        {formatCurrency(exp.amount)}
                      </td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => handleDelete(exp.id)}
                          className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
