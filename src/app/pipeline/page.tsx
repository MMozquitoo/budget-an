"use client";

import { useEffect, useState } from "react";
import {
  formatCurrency,
  formatCurrencyDecimal,
  cn,
  BUSINESS_LINE_COLORS,
  PIPELINE_STATUS_COLORS,
} from "@/lib/utils";

/* ── types ─────────────────────────────────────── */

interface BusinessLine {
  id: string;
  name: string;
  color: string;
}

interface Opportunity {
  id: string;
  account: string;
  value: number;
  probability: number;
  closeDate: string;
  owner: string | null;
  businessLineId: string;
  businessLine: BusinessLine;
  status: "OPEN" | "WON" | "LOST";
  notes: string | null;
}

type FilterTab = "ALL" | "OPEN" | "WON" | "LOST";

/* ── helpers ───────────────────────────────────── */

function lineColor(name: string): string {
  return BUSINESS_LINE_COLORS[name] ?? "#94a3b8";
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/* ── component ─────────────────────────────────── */

export default function PipelinePage() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [lines, setLines] = useState<BusinessLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>("ALL");
  const [showForm, setShowForm] = useState(false);

  /* ── fetch ─────────────────────────────────────── */

  function reload() {
    setLoading(true);
    Promise.all([
      fetch("/api/pipeline-opportunities").then((r) => r.json()),
      fetch("/api/business-lines").then((r) => r.json()),
    ])
      .then(([ops, bl]) => {
        setOpportunities(ops);
        setLines(bl);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    reload();
  }, []);

  /* ── derived data ──────────────────────────────── */

  const openOps = opportunities.filter((o) => o.status === "OPEN");

  const totalPipeline = openOps.reduce((s, o) => s + o.value, 0);

  const weightedPipeline = openOps.reduce(
    (s, o) => s + (o.value * o.probability) / 100,
    0
  );

  const now = new Date();
  const in90 = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
  const expected90 = openOps
    .filter((o) => new Date(o.closeDate) <= in90)
    .reduce((s, o) => s + (o.value * o.probability) / 100, 0);

  /* filtered + sorted */
  const filtered =
    filter === "ALL"
      ? opportunities
      : opportunities.filter((o) => o.status === filter);

  const sorted = [...filtered].sort(
    (a, b) => new Date(a.closeDate).getTime() - new Date(b.closeDate).getTime()
  );

  /* ── form handler ──────────────────────────────── */

  async function addOpportunity(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await fetch("/api/pipeline-opportunities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        account: fd.get("account"),
        value: Number(fd.get("value")),
        probability: Number(fd.get("probability")),
        closeDate: fd.get("closeDate"),
        owner: fd.get("owner") || null,
        businessLineId: fd.get("businessLineId"),
        notes: fd.get("notes") || null,
      }),
    });
    setShowForm(false);
    reload();
  }

  async function markStatus(id: string, status: "WON" | "LOST") {
    await fetch("/api/pipeline-opportunities", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    reload();
  }

  async function deleteOpp(id: string) {
    await fetch(`/api/pipeline-opportunities?id=${id}`, { method: "DELETE" });
    reload();
  }

  /* ── input class ───────────────────────────────── */

  const inputCls =
    "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";

  /* ── probability slider state ─────────────────── */

  const [probValue, setProbValue] = useState(50);

  /* ── render ────────────────────────────────────── */

  const tabs: { key: FilterTab; label: string }[] = [
    { key: "ALL", label: "All" },
    { key: "OPEN", label: "Open" },
    { key: "WON", label: "Won" },
    { key: "LOST", label: "Lost" },
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Pipeline</h1>
        <p className="text-sm text-gray-500">
          How does it look in 90 days?
        </p>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
        </div>
      ) : (
        <>
          {/* KPI cards */}
          <div className="mb-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-gray-500">Total Pipeline</p>
              <p className="text-2xl font-bold text-blue-600">
                {formatCurrency(totalPipeline)}
              </p>
              <p className="text-xs text-gray-400">
                {openOps.length} open opportunities
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-gray-500">Weighted Pipeline</p>
              <p className="text-2xl font-bold text-indigo-600">
                {formatCurrency(weightedPipeline)}
              </p>
              <p className="text-xs text-gray-400">
                value x probability
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-gray-500">
                Expected Close (90 days)
              </p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(expected90)}
              </p>
              <p className="text-xs text-gray-400">
                weighted, closing by {fmtDate(in90.toISOString())}
              </p>
            </div>
          </div>

          {/* Filter tabs + Add button */}
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
              {tabs.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setFilter(t.key)}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    filter === t.key
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              {showForm ? "Cancel" : "Add Opportunity"}
            </button>
          </div>

          {/* Add form */}
          {showForm && (
            <form
              onSubmit={addOpportunity}
              className="mb-6 space-y-3 rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  name="account"
                  placeholder="Account"
                  required
                  className={inputCls}
                />
                <input
                  name="value"
                  type="number"
                  step="0.01"
                  placeholder="Value"
                  required
                  className={inputCls}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-gray-600">
                  Probability: {probValue}%
                </label>
                <input
                  name="probability"
                  type="range"
                  min="0"
                  max="100"
                  value={probValue}
                  onChange={(e) => setProbValue(Number(e.target.value))}
                  className="w-full accent-indigo-600"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <input
                  name="closeDate"
                  type="date"
                  required
                  className={inputCls}
                />
                <input
                  name="owner"
                  placeholder="Owner"
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
              <textarea
                name="notes"
                placeholder="Notes (optional)"
                rows={2}
                className={inputCls}
              />
              <button
                type="submit"
                className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              >
                Save Opportunity
              </button>
            </form>
          )}

          {/* Pipeline table */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-gray-500">
                    <th className="pb-3 font-medium">Account</th>
                    <th className="pb-3 font-medium">Business Line</th>
                    <th className="pb-3 text-right font-medium">Value</th>
                    <th className="pb-3 font-medium">Probability</th>
                    <th className="pb-3 text-right font-medium">Weighted</th>
                    <th className="pb-3 font-medium">Close Date</th>
                    <th className="pb-3 font-medium">Owner</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {sorted.map((o) => {
                    const weighted = (o.value * o.probability) / 100;
                    const isWon = o.status === "WON";
                    const isLost = o.status === "LOST";

                    return (
                      <tr
                        key={o.id}
                        className={cn(
                          isLost && "line-through text-gray-400"
                        )}
                        style={{
                          borderLeft: isWon
                            ? `4px solid ${PIPELINE_STATUS_COLORS.WON}`
                            : isLost
                              ? `4px solid ${PIPELINE_STATUS_COLORS.LOST}`
                              : undefined,
                        }}
                      >
                        <td
                          className={cn(
                            "py-2.5",
                            isLost ? "text-gray-400" : "text-gray-900"
                          )}
                        >
                          {o.account}
                        </td>
                        <td className="py-2.5">
                          <span className="flex items-center gap-1.5">
                            <span
                              className="inline-block h-2.5 w-2.5 rounded-full"
                              style={{
                                backgroundColor: lineColor(
                                  o.businessLine.name
                                ),
                              }}
                            />
                            <span
                              className={
                                isLost
                                  ? "text-gray-400"
                                  : "text-gray-700"
                              }
                            >
                              {o.businessLine.name}
                            </span>
                          </span>
                        </td>
                        <td
                          className={cn(
                            "py-2.5 text-right font-medium",
                            isLost ? "text-gray-400" : "text-gray-900"
                          )}
                        >
                          {formatCurrency(o.value)}
                        </td>
                        <td className="py-2.5">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-20 rounded-full bg-gray-100">
                              <div
                                className="h-2 rounded-full"
                                style={{
                                  width: `${o.probability}%`,
                                  backgroundColor:
                                    PIPELINE_STATUS_COLORS[o.status] ??
                                    "#3b82f6",
                                }}
                              />
                            </div>
                            <span
                              className={cn(
                                "text-xs",
                                isLost
                                  ? "text-gray-400"
                                  : "text-gray-600"
                              )}
                            >
                              {o.probability}%
                            </span>
                          </div>
                        </td>
                        <td
                          className={cn(
                            "py-2.5 text-right",
                            isLost ? "text-gray-400" : "text-gray-700"
                          )}
                        >
                          {formatCurrencyDecimal(weighted)}
                        </td>
                        <td
                          className={cn(
                            "py-2.5",
                            isLost ? "text-gray-400" : "text-gray-700"
                          )}
                        >
                          {fmtDate(o.closeDate)}
                        </td>
                        <td
                          className={cn(
                            "py-2.5",
                            isLost ? "text-gray-400" : "text-gray-700"
                          )}
                        >
                          {o.owner ?? "--"}
                        </td>
                        <td className="py-2.5">
                          <span
                            className="inline-block rounded-full px-2 py-0.5 text-xs font-medium"
                            style={{
                              backgroundColor:
                                o.status === "WON"
                                  ? "#dcfce7"
                                  : o.status === "LOST"
                                    ? "#fee2e2"
                                    : "#dbeafe",
                              color:
                                PIPELINE_STATUS_COLORS[o.status] ??
                                "#3b82f6",
                            }}
                          >
                            {o.status}
                          </span>
                        </td>
                        <td className="py-2.5">
                          <div className="flex items-center gap-1">
                            {o.status === "OPEN" && (
                              <>
                                <button
                                  onClick={() => markStatus(o.id, "WON")}
                                  className="rounded bg-green-50 px-2 py-1 text-xs font-medium text-green-700 hover:bg-green-100"
                                >
                                  Won
                                </button>
                                <button
                                  onClick={() => markStatus(o.id, "LOST")}
                                  className="rounded bg-red-50 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
                                >
                                  Lost
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => deleteOpp(o.id)}
                              className="rounded bg-gray-50 px-2 py-1 text-xs text-red-500 hover:bg-gray-100 hover:text-red-700"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {sorted.length === 0 && (
                    <tr>
                      <td
                        colSpan={9}
                        className="py-6 text-center text-gray-400"
                      >
                        No opportunities found
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
