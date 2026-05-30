"use client";

import { useEffect, useState } from "react";
import {
  formatCurrency,
  formatCurrencyDecimal,
  formatPercent,
  formatHours,
  getCurrentMonth,
  getCurrentYear,
  getMonthName,
  cn,
  BUSINESS_LINE_COLORS,
  TIME_ENTRY_TYPE_LABELS,
} from "@/lib/utils";

/* ── types ─────────────────────────────────────── */

interface BusinessLine {
  id: string;
  name: string;
  color: string;
}

interface RevenueItem {
  id: string;
  date: string;
  amount: number;
  description: string;
  client: string | null;
  businessLineId: string;
  businessLine: BusinessLine;
}

interface ExpenseItem {
  id: string;
  date: string;
  amount: number;
  description: string;
  category: string | null;
  businessLineId: string;
  businessLine: BusinessLine;
}

interface EventItem {
  id: string;
  name: string;
  date: string;
  revenue: number;
  cost: number;
  businessLineId: string;
  businessLine: BusinessLine;
  status: string;
  notes: string | null;
}

interface TimeEntryItem {
  id: string;
  date: string;
  hours: number;
  type: string;
  businessLineId: string;
  businessLine: BusinessLine;
  eventId: string | null;
  event: { id: string; name: string } | null;
  projectName: string | null;
  notes: string | null;
}

/* ── helpers ───────────────────────────────────── */

function lineColor(name: string): string {
  return BUSINESS_LINE_COLORS[name] ?? "#94a3b8";
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
  });
}

/* ── component ─────────────────────────────────── */

export default function ButterflyPage() {
  const [month, setMonth] = useState(10);
  const [year, setYear] = useState(2025);
  const [loading, setLoading] = useState(true);

  const [revenues, setRevenues] = useState<RevenueItem[]>([]);
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [lines, setLines] = useState<BusinessLine[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntryItem[]>([]);

  const [showRevenueForm, setShowRevenueForm] = useState(false);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showEventForm, setShowEventForm] = useState(false);
  const [showTimeEntryForm, setShowTimeEntryForm] = useState(false);

  /* ── fetch ─────────────────────────────────────── */

  function reload() {
    setLoading(true);
    Promise.all([
      fetch(`/api/revenues?month=${month}&year=${year}`).then((r) => r.json()),
      fetch(`/api/business-expenses?month=${month}&year=${year}`).then((r) => r.json()),
      fetch("/api/business-lines").then((r) => r.json()),
      fetch("/api/events?status=COMPLETED").then((r) => r.json()),
      fetch(`/api/time-entries?month=${month}&year=${year}`).then((r) => r.json()),
    ])
      .then(([rev, exp, bl, ev, te]) => {
        setRevenues(rev);
        setExpenses(exp);
        setLines(bl);
        setEvents(ev);
        setTimeEntries(te);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, year]);

  /* ── derived data ──────────────────────────────── */

  const totalRevenue = revenues.reduce((s, r) => s + r.amount, 0);
  const totalCosts = expenses.reduce((s, e) => s + e.amount, 0);
  const margin = totalRevenue - totalCosts;
  const marginPct = totalRevenue > 0 ? (margin / totalRevenue) * 100 : 0;
  const totalHours = timeEntries.reduce((s, te) => s + te.hours, 0);
  const marginPerHour = totalHours > 0 ? totalRevenue / totalHours : 0;

  /* performance by business line */
  type LinePerf = {
    name: string;
    revenue: number;
    costs: number;
    margin: number;
    hours: number;
    perHour: number;
  };

  const perfMap: Record<string, LinePerf> = {};
  lines.forEach((l) => {
    perfMap[l.id] = {
      name: l.name,
      revenue: 0,
      costs: 0,
      margin: 0,
      hours: 0,
      perHour: 0,
    };
  });
  revenues.forEach((r) => {
    if (perfMap[r.businessLineId]) {
      perfMap[r.businessLineId].revenue += r.amount;
    }
  });
  expenses.forEach((e) => {
    if (perfMap[e.businessLineId]) {
      perfMap[e.businessLineId].costs += e.amount;
    }
  });
  timeEntries.forEach((te) => {
    if (perfMap[te.businessLineId]) {
      perfMap[te.businessLineId].hours += te.hours;
    }
  });
  Object.values(perfMap).forEach((p) => {
    p.margin = p.revenue - p.costs;
    p.perHour = p.hours > 0 ? p.revenue / p.hours : 0;
  });

  const perfRows = Object.entries(perfMap)
    .map(([id, p]) => ({ id, ...p }))
    .sort((a, b) => b.perHour - a.perHour);

  const bestId = perfRows.length > 0 ? perfRows[0].id : null;

  /* ── form handlers ─────────────────────────────── */

  async function addRevenue(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await fetch("/api/revenues", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: fd.get("date"),
        amount: Number(fd.get("amount")),
        description: fd.get("description"),
        client: fd.get("client") || null,
        businessLineId: fd.get("businessLineId"),
      }),
    });
    setShowRevenueForm(false);
    reload();
  }

  async function addExpense(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await fetch("/api/business-expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: fd.get("date"),
        amount: Number(fd.get("amount")),
        description: fd.get("description"),
        category: fd.get("category") || null,
        businessLineId: fd.get("businessLineId"),
      }),
    });
    setShowExpenseForm(false);
    reload();
  }

  async function addEvent(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: fd.get("name"),
        date: fd.get("date"),
        revenue: Number(fd.get("revenue")),
        cost: Number(fd.get("cost")),
        businessLineId: fd.get("businessLineId"),
        status: fd.get("status"),
      }),
    });
    setShowEventForm(false);
    reload();
  }

  async function addTimeEntry(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await fetch("/api/time-entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: fd.get("date"),
        hours: Number(fd.get("hours")),
        type: fd.get("type"),
        businessLineId: fd.get("businessLineId"),
        projectName: fd.get("projectName") || null,
        notes: fd.get("notes") || null,
      }),
    });
    setShowTimeEntryForm(false);
    reload();
  }

  async function deleteRevenue(id: string) {
    await fetch(`/api/revenues?id=${id}`, { method: "DELETE" });
    reload();
  }

  async function deleteExpense(id: string) {
    await fetch(`/api/business-expenses?id=${id}`, { method: "DELETE" });
    reload();
  }

  async function deleteEvent(id: string) {
    await fetch(`/api/events?id=${id}`, { method: "DELETE" });
    reload();
  }

  async function deleteTimeEntry(id: string) {
    await fetch(`/api/time-entries?id=${id}`, { method: "DELETE" });
    reload();
  }

  /* ── input class ───────────────────────────────── */

  const inputCls =
    "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";

  /* ── render ────────────────────────────────────── */

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Butterfly</h1>
          <p className="text-sm text-gray-500">
            Revenue, costs, margin by business line
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

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
        </div>
      ) : (
        <>
          {/* Row 1 — KPI cards */}
          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-gray-500">Total Revenue</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(totalRevenue)}
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-gray-500">Total Costs</p>
              <p className="text-2xl font-bold text-red-600">
                {formatCurrency(totalCosts)}
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-gray-500">Margin</p>
              <p
                className={cn(
                  "text-2xl font-bold",
                  margin >= 0 ? "text-green-600" : "text-red-600"
                )}
              >
                {formatCurrency(margin)}
              </p>
              <p className="text-xs text-gray-400">
                {formatPercent(marginPct)}
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-gray-500">Margin per Hour</p>
              <p className="text-2xl font-bold text-gray-900">
                {totalHours > 0
                  ? formatCurrencyDecimal(marginPerHour)
                  : "--"}
              </p>
              <p className="text-xs text-gray-400">
                {formatHours(totalHours)} tracked
              </p>
            </div>
          </div>

          {/* Row 2 — Performance by Business Line */}
          <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              Performance by Business Line
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-gray-500">
                    <th className="pb-3 font-medium">Business Line</th>
                    <th className="pb-3 text-right font-medium">Revenue</th>
                    <th className="pb-3 text-right font-medium">Costs</th>
                    <th className="pb-3 text-right font-medium">Margin</th>
                    <th className="pb-3 text-right font-medium">Hours</th>
                    <th className="pb-3 text-right font-medium">/Hour</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {perfRows.map((row) => {
                    const isBest = row.id === bestId;
                    return (
                      <tr
                        key={row.id}
                        className={isBest ? "font-bold" : ""}
                      >
                        <td className="py-2.5 text-gray-900">
                          <span className="flex items-center gap-2">
                            <span
                              className="inline-block h-3 w-3 rounded-full"
                              style={{
                                backgroundColor: lineColor(row.name),
                              }}
                            />
                            {row.name}
                          </span>
                        </td>
                        <td className="py-2.5 text-right text-green-600">
                          {formatCurrency(row.revenue)}
                        </td>
                        <td className="py-2.5 text-right text-red-600">
                          {formatCurrency(row.costs)}
                        </td>
                        <td
                          className={cn(
                            "py-2.5 text-right",
                            row.margin >= 0
                              ? "text-green-600"
                              : "text-red-600"
                          )}
                        >
                          {formatCurrency(row.margin)}
                        </td>
                        <td className="py-2.5 text-right text-gray-700">
                          {formatHours(row.hours)}
                        </td>
                        <td className="py-2.5 text-right text-gray-900">
                          {row.hours > 0
                            ? formatCurrencyDecimal(row.perHour)
                            : "--"}
                        </td>
                      </tr>
                    );
                  })}
                  {/* Total row */}
                  <tr className="border-t border-gray-200 font-semibold">
                    <td className="py-2.5 text-gray-900">Total</td>
                    <td className="py-2.5 text-right text-green-600">
                      {formatCurrency(totalRevenue)}
                    </td>
                    <td className="py-2.5 text-right text-red-600">
                      {formatCurrency(totalCosts)}
                    </td>
                    <td
                      className={cn(
                        "py-2.5 text-right",
                        margin >= 0 ? "text-green-600" : "text-red-600"
                      )}
                    >
                      {formatCurrency(margin)}
                    </td>
                    <td className="py-2.5 text-right text-gray-700">
                      {formatHours(totalHours)}
                    </td>
                    <td className="py-2.5 text-right text-gray-900">
                      {totalHours > 0
                        ? formatCurrencyDecimal(totalRevenue / totalHours)
                        : "--"}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Row 3 — Revenue & Expenses side by side */}
          <div className="mb-6 grid gap-6 lg:grid-cols-2">
            {/* Revenue */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">
                  Revenue
                </h2>
                <button
                  onClick={() => setShowRevenueForm(!showRevenueForm)}
                  className="rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700"
                >
                  {showRevenueForm ? "Cancel" : "Add Revenue"}
                </button>
              </div>

              {showRevenueForm && (
                <form
                  onSubmit={addRevenue}
                  className="mb-4 space-y-3 rounded-lg border border-gray-100 bg-gray-50 p-4"
                >
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input
                      name="date"
                      type="date"
                      required
                      className={inputCls}
                    />
                    <input
                      name="amount"
                      type="number"
                      step="0.01"
                      placeholder="Amount"
                      required
                      className={inputCls}
                    />
                  </div>
                  <input
                    name="description"
                    placeholder="Description"
                    required
                    className={inputCls}
                  />
                  <input
                    name="client"
                    placeholder="Client"
                    className={inputCls}
                  />
                  <select name="businessLineId" required className={inputCls}>
                    <option value="">Select business line</option>
                    {lines.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    className="w-full rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                  >
                    Save Revenue
                  </button>
                </form>
              )}

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-left text-gray-500">
                      <th className="pb-2 font-medium">Date</th>
                      <th className="pb-2 font-medium">Client</th>
                      <th className="pb-2 font-medium">Description</th>
                      <th className="pb-2 font-medium">Line</th>
                      <th className="pb-2 text-right font-medium">Amount</th>
                      <th className="pb-2 font-medium" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {revenues.slice(0, 10).map((r) => (
                      <tr key={r.id}>
                        <td className="py-2 text-gray-700">{fmtDate(r.date)}</td>
                        <td className="py-2 text-gray-700">{r.client ?? "--"}</td>
                        <td className="py-2 text-gray-900">{r.description}</td>
                        <td className="py-2">
                          <span className="flex items-center gap-1">
                            <span
                              className="inline-block h-2 w-2 rounded-full"
                              style={{
                                backgroundColor: lineColor(
                                  r.businessLine.name
                                ),
                              }}
                            />
                            <span className="text-gray-600 text-xs">
                              {r.businessLine.name}
                            </span>
                          </span>
                        </td>
                        <td className="py-2 text-right font-medium text-green-600">
                          {formatCurrency(r.amount)}
                        </td>
                        <td className="py-2 text-right">
                          <button
                            onClick={() => deleteRevenue(r.id)}
                            className="text-xs text-red-500 hover:text-red-700"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                    {revenues.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-4 text-center text-gray-400">
                          No revenue recorded
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Expenses */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">
                  Expenses
                </h2>
                <button
                  onClick={() => setShowExpenseForm(!showExpenseForm)}
                  className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
                >
                  {showExpenseForm ? "Cancel" : "Add Expense"}
                </button>
              </div>

              {showExpenseForm && (
                <form
                  onSubmit={addExpense}
                  className="mb-4 space-y-3 rounded-lg border border-gray-100 bg-gray-50 p-4"
                >
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input
                      name="date"
                      type="date"
                      required
                      className={inputCls}
                    />
                    <input
                      name="amount"
                      type="number"
                      step="0.01"
                      placeholder="Amount"
                      required
                      className={inputCls}
                    />
                  </div>
                  <input
                    name="description"
                    placeholder="Description"
                    required
                    className={inputCls}
                  />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input
                      name="category"
                      placeholder="Category"
                      className={inputCls}
                    />
                    <select
                      name="businessLineId"
                      required
                      className={inputCls}
                    >
                      <option value="">Select business line</option>
                      {lines.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="submit"
                    className="w-full rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                  >
                    Save Expense
                  </button>
                </form>
              )}

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-left text-gray-500">
                      <th className="pb-2 font-medium">Date</th>
                      <th className="pb-2 font-medium">Description</th>
                      <th className="pb-2 font-medium">Category</th>
                      <th className="pb-2 font-medium">Line</th>
                      <th className="pb-2 text-right font-medium">Amount</th>
                      <th className="pb-2 font-medium" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {expenses.slice(0, 10).map((exp) => (
                      <tr key={exp.id}>
                        <td className="py-2 text-gray-700">
                          {fmtDate(exp.date)}
                        </td>
                        <td className="py-2 text-gray-900">
                          {exp.description}
                        </td>
                        <td className="py-2 text-gray-600">
                          {exp.category ?? "--"}
                        </td>
                        <td className="py-2">
                          <span className="flex items-center gap-1">
                            <span
                              className="inline-block h-2 w-2 rounded-full"
                              style={{
                                backgroundColor: lineColor(
                                  exp.businessLine.name
                                ),
                              }}
                            />
                            <span className="text-gray-600 text-xs">
                              {exp.businessLine.name}
                            </span>
                          </span>
                        </td>
                        <td className="py-2 text-right font-medium text-red-600">
                          {formatCurrency(exp.amount)}
                        </td>
                        <td className="py-2 text-right">
                          <button
                            onClick={() => deleteExpense(exp.id)}
                            className="text-xs text-red-500 hover:text-red-700"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                    {expenses.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-4 text-center text-gray-400">
                          No expenses recorded
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Row 4 — Events P&L */}
          <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Events P&L
              </h2>
              <button
                onClick={() => setShowEventForm(!showEventForm)}
                className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
              >
                {showEventForm ? "Cancel" : "Add Event"}
              </button>
            </div>

            {showEventForm && (
              <form
                onSubmit={addEvent}
                className="mb-4 space-y-3 rounded-lg border border-gray-100 bg-gray-50 p-4"
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    name="name"
                    placeholder="Event name"
                    required
                    className={inputCls}
                  />
                  <input
                    name="date"
                    type="date"
                    required
                    className={inputCls}
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    name="revenue"
                    type="number"
                    step="0.01"
                    placeholder="Revenue"
                    required
                    className={inputCls}
                  />
                  <input
                    name="cost"
                    type="number"
                    step="0.01"
                    placeholder="Cost"
                    required
                    className={inputCls}
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <select
                    name="businessLineId"
                    required
                    className={inputCls}
                  >
                    <option value="">Select business line</option>
                    {lines.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                  <select name="status" required className={inputCls}>
                    <option value="PLANNED">Planned</option>
                    <option value="CONFIRMED">Confirmed</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </div>
                <button
                  type="submit"
                  className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                >
                  Save Event
                </button>
              </form>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-gray-500">
                    <th className="pb-3 font-medium">Event</th>
                    <th className="pb-3 font-medium">Date</th>
                    <th className="pb-3 text-right font-medium">Revenue</th>
                    <th className="pb-3 text-right font-medium">Cost</th>
                    <th className="pb-3 text-right font-medium">Margin</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {events.map((ev) => {
                    const evMargin = ev.revenue - ev.cost;
                    return (
                      <tr key={ev.id}>
                        <td className="py-2.5 text-gray-900">{ev.name}</td>
                        <td className="py-2.5 text-gray-700">
                          {fmtDate(ev.date)}
                        </td>
                        <td className="py-2.5 text-right text-green-600">
                          {formatCurrency(ev.revenue)}
                        </td>
                        <td className="py-2.5 text-right text-red-600">
                          {formatCurrency(ev.cost)}
                        </td>
                        <td
                          className={cn(
                            "py-2.5 text-right",
                            evMargin >= 0 ? "text-green-600" : "text-red-600"
                          )}
                        >
                          {formatCurrency(evMargin)}
                        </td>
                        <td className="py-2.5">
                          <span
                            className="inline-block rounded-full px-2 py-0.5 text-xs font-medium"
                            style={{
                              backgroundColor:
                                ev.status === "COMPLETED"
                                  ? "#dcfce7"
                                  : ev.status === "CANCELLED"
                                    ? "#fee2e2"
                                    : "#e0e7ff",
                              color:
                                ev.status === "COMPLETED"
                                  ? "#16a34a"
                                  : ev.status === "CANCELLED"
                                    ? "#dc2626"
                                    : "#4f46e5",
                            }}
                          >
                            {ev.status}
                          </span>
                        </td>
                        <td className="py-2.5 text-right">
                          <button
                            onClick={() => deleteEvent(ev.id)}
                            className="text-xs text-red-500 hover:text-red-700"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {events.length === 0 && (
                    <tr>
                      <td
                        colSpan={7}
                        className="py-4 text-center text-gray-400"
                      >
                        No completed events
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Row 5 — Time Tracking */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Time Tracking
              </h2>
              <button
                onClick={() => setShowTimeEntryForm(!showTimeEntryForm)}
                className="rounded-lg bg-purple-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-purple-700"
              >
                {showTimeEntryForm ? "Cancel" : "Log Time"}
              </button>
            </div>

            {showTimeEntryForm && (
              <form
                onSubmit={addTimeEntry}
                className="mb-4 space-y-3 rounded-lg border border-gray-100 bg-gray-50 p-4"
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    name="date"
                    type="date"
                    required
                    className={inputCls}
                  />
                  <input
                    name="hours"
                    type="number"
                    step="0.25"
                    min="0.25"
                    placeholder="Hours"
                    required
                    className={inputCls}
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <select name="type" required className={inputCls}>
                    <option value="">Select type</option>
                    {Object.entries(TIME_ENTRY_TYPE_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <select
                    name="businessLineId"
                    required
                    className={inputCls}
                  >
                    <option value="">Select business line</option>
                    {lines.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    name="projectName"
                    placeholder="Project name (optional)"
                    className={inputCls}
                  />
                  <input
                    name="notes"
                    placeholder="Notes (optional)"
                    className={inputCls}
                  />
                </div>
                <button
                  type="submit"
                  className="w-full rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
                >
                  Save Time Entry
                </button>
              </form>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-gray-500">
                    <th className="pb-2 font-medium">Date</th>
                    <th className="pb-2 font-medium">Business Line</th>
                    <th className="pb-2 font-medium">Type</th>
                    <th className="pb-2 font-medium">Project</th>
                    <th className="pb-2 text-right font-medium">Hours</th>
                    <th className="pb-2 font-medium">Notes</th>
                    <th className="pb-2 font-medium" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {timeEntries.slice(0, 15).map((te) => (
                    <tr key={te.id}>
                      <td className="py-2 text-gray-700">{fmtDate(te.date)}</td>
                      <td className="py-2">
                        <span className="flex items-center gap-1">
                          <span
                            className="inline-block h-2 w-2 rounded-full"
                            style={{
                              backgroundColor: lineColor(
                                te.businessLine.name
                              ),
                            }}
                          />
                          <span className="text-gray-600 text-xs">
                            {te.businessLine.name}
                          </span>
                        </span>
                      </td>
                      <td className="py-2 text-gray-700">
                        {TIME_ENTRY_TYPE_LABELS[te.type] ?? te.type}
                      </td>
                      <td className="py-2 text-gray-700">
                        {te.projectName ?? "--"}
                      </td>
                      <td className="py-2 text-right font-medium text-gray-900">
                        {formatHours(te.hours)}
                      </td>
                      <td className="py-2 text-gray-600 text-xs max-w-[200px] truncate">
                        {te.notes ?? "--"}
                      </td>
                      <td className="py-2 text-right">
                        <button
                          onClick={() => deleteTimeEntry(te.id)}
                          className="text-xs text-red-500 hover:text-red-700"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                  {timeEntries.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-4 text-center text-gray-400">
                        No time entries recorded
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
