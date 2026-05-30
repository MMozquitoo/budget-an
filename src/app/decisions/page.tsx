"use client";

import { useEffect, useState } from "react";
import {
  formatCurrency,
  DECISION_CATEGORY_LABELS,
  DECISION_CATEGORY_COLORS,
  DECISION_STATUS_LABELS,
} from "@/lib/utils";

interface BusinessLine {
  id: string;
  name: string;
}

interface EventRecord {
  id: string;
  name: string;
}

interface Decision {
  id: string;
  date: string;
  amount: number | null;
  scope: "PERSONAL" | "BUSINESS";
  category: string;
  title: string;
  rationale: string | null;
  expectedROI: string | null;
  actualROI: string | null;
  status: string;
  thresholdTriggered: boolean;
  businessLineId: string | null;
  eventId: string | null;
  reviewDate: string | null;
  businessLine?: { id: string; name: string } | null;
  event?: { id: string; name: string } | null;
}

const CATEGORY_PILL_STYLES: Record<string, { bg: string; text: string }> = {
  HIRE: { bg: "bg-blue-100", text: "text-blue-700" },
  EVENT: { bg: "bg-amber-100", text: "text-amber-700" },
  TRAVEL: { bg: "bg-teal-100", text: "text-teal-700" },
  TOOL: { bg: "bg-gray-100", text: "text-gray-700" },
  PROJECT: { bg: "bg-indigo-100", text: "text-indigo-700" },
  PARTNERSHIP: { bg: "bg-purple-100", text: "text-purple-700" },
  INVESTMENT: { bg: "bg-green-100", text: "text-green-700" },
};

const SCOPE_COLORS: Record<string, { bg: string; text: string }> = {
  PERSONAL: { bg: "bg-sky-100", text: "text-sky-700" },
  BUSINESS: { bg: "bg-orange-100", text: "text-orange-700" },
};

const STATUS_PILL_STYLES: Record<string, { bg: string; text: string }> = {
  PLANNED: { bg: "bg-yellow-100", text: "text-yellow-700" },
  APPROVED: { bg: "bg-blue-100", text: "text-blue-700" },
  DONE: { bg: "bg-green-100", text: "text-green-700" },
  ABANDONED: { bg: "bg-red-100", text: "text-red-700" },
};

const SCOPES = ["All", "PERSONAL", "BUSINESS"] as const;
const CATEGORIES = [
  "All",
  "HIRE",
  "EVENT",
  "TRAVEL",
  "TOOL",
  "PROJECT",
  "PARTNERSHIP",
  "INVESTMENT",
] as const;
const STATUSES = ["All", "PLANNED", "APPROVED", "DONE", "ABANDONED"] as const;

function computeThresholdTriggered(
  scope: "PERSONAL" | "BUSINESS",
  amount: number | null
): boolean {
  if (amount === null) return false;
  if (scope === "PERSONAL" && amount >= 500) return true;
  if (scope === "BUSINESS" && amount >= 2000) return true;
  return false;
}

export default function DecisionsPage() {
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [businessLines, setBusinessLines] = useState<BusinessLine[]>([]);
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const [scopeFilter, setScopeFilter] = useState<string>("All");
  const [categoryFilter, setCategoryFilter] = useState<string>("All");
  const [statusFilter, setStatusFilter] = useState<string>("All");

  const [showForm, setShowForm] = useState(false);
  const [formDate, setFormDate] = useState("");
  const [formScope, setFormScope] = useState<"PERSONAL" | "BUSINESS">("PERSONAL");
  const [formTitle, setFormTitle] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formCategory, setFormCategory] = useState("HIRE");
  const [formBusinessLineId, setFormBusinessLineId] = useState("");
  const [formEventId, setFormEventId] = useState("");
  const [formRationale, setFormRationale] = useState("");
  const [formExpectedROI, setFormExpectedROI] = useState("");
  const [formStatus, setFormStatus] = useState("PLANNED");
  const [formReviewDate, setFormReviewDate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [actualROIEditing, setActualROIEditing] = useState<string | null>(null);
  const [actualROIText, setActualROIText] = useState("");

  function fetchDecisions() {
    setLoading(true);
    fetch("/api/decisions")
      .then((r) => r.json())
      .then(setDecisions)
      .finally(() => setLoading(false));
  }

  function fetchBusinessLines() {
    fetch("/api/business-lines")
      .then((r) => r.json())
      .then(setBusinessLines)
      .catch(() => setBusinessLines([]));
  }

  function fetchEvents() {
    fetch("/api/events")
      .then((r) => r.json())
      .then(setEvents)
      .catch(() => setEvents([]));
  }

  useEffect(() => {
    fetchDecisions();
    fetchBusinessLines();
    fetchEvents();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const amount = formAmount ? Number(formAmount) : null;
    const scope = formScope;
    await fetch("/api/decisions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: formDate,
        scope,
        title: formTitle,
        amount,
        thresholdTriggered: computeThresholdTriggered(scope, amount),
        category: formCategory,
        businessLineId: formBusinessLineId || null,
        eventId: formEventId || null,
        rationale: formRationale || null,
        expectedROI: formExpectedROI || null,
        status: formStatus,
        reviewDate: formReviewDate || null,
      }),
    });
    setSubmitting(false);
    setShowForm(false);
    setFormDate("");
    setFormScope("PERSONAL");
    setFormTitle("");
    setFormAmount("");
    setFormCategory("HIRE");
    setFormBusinessLineId("");
    setFormEventId("");
    setFormRationale("");
    setFormExpectedROI("");
    setFormStatus("PLANNED");
    setFormReviewDate("");
    fetchDecisions();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this decision?")) return;
    await fetch(`/api/decisions?id=${id}`, { method: "DELETE" });
    fetchDecisions();
  }

  async function handleActualROISave(id: string) {
    await fetch("/api/decisions", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, actualROI: actualROIText }),
    });
    setActualROIEditing(null);
    setActualROIText("");
    fetchDecisions();
  }

  async function handleStatusChange(id: string, newStatus: string) {
    await fetch("/api/decisions", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: newStatus }),
    });
    fetchDecisions();
  }

  const filtered = decisions.filter((d) => {
    if (scopeFilter !== "All" && d.scope !== scopeFilter) return false;
    if (categoryFilter !== "All" && d.category !== categoryFilter) return false;
    if (statusFilter !== "All" && d.status !== statusFilter) return false;
    return true;
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Decisions</h1>
        <p className="text-sm text-gray-500">
          Capital allocation decisions that compound
        </p>
      </div>

      {/* Thresholds reminder */}
      <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        {"Personal: >500€ | Business: >2,000€ | Strategic: Hires, Events, Projects, Partnerships"}
      </div>

      {/* Filters */}
      <div className="mb-4 space-y-3">
        {/* Scope filter */}
        <div className="flex flex-wrap gap-2">
          {SCOPES.map((s) => (
            <button
              key={s}
              onClick={() => setScopeFilter(s)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                scopeFilter === s
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {s === "All" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
        {/* Category filter */}
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategoryFilter(c)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                categoryFilter === c
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {c === "All" ? "All" : DECISION_CATEGORY_LABELS[c] || c}
            </button>
          ))}
        </div>
        {/* Status filter */}
        <div className="flex flex-wrap gap-2">
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                statusFilter === s
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {s === "All" ? "All" : DECISION_STATUS_LABELS[s] || s}
            </button>
          ))}
        </div>
      </div>

      {/* Add Decision toggle */}
      <div className="mb-6">
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          {showForm ? "Cancel" : "+ Add Decision"}
        </button>
      </div>

      {/* Add Decision Form */}
      {showForm && (
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            New Decision
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Date
                </label>
                <input
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  required
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Scope
                </label>
                <select
                  value={formScope}
                  onChange={(e) =>
                    setFormScope(e.target.value as "PERSONAL" | "BUSINESS")
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="PERSONAL">Personal</option>
                  <option value="BUSINESS">Business</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Amount (optional)
                </label>
                <input
                  type="number"
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Category
                </label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                >
                  {Object.entries(DECISION_CATEGORY_LABELS).map(
                    ([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    )
                  )}
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Title
              </label>
              <input
                type="text"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder="What is the decision?"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Business Line (optional)
                </label>
                <select
                  value={formBusinessLineId}
                  onChange={(e) => setFormBusinessLineId(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="">-- None --</option>
                  {businessLines.map((bl) => (
                    <option key={bl.id} value={bl.id}>
                      {bl.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Event (optional)
                </label>
                <select
                  value={formEventId}
                  onChange={(e) => setFormEventId(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="">-- None --</option>
                  {events.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {ev.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Status
                </label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                >
                  {Object.entries(DECISION_STATUS_LABELS).map(
                    ([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    )
                  )}
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Review Date (optional)
              </label>
              <input
                type="date"
                value={formReviewDate}
                onChange={(e) => setFormReviewDate(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm sm:max-w-xs"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Rationale
              </label>
              <textarea
                value={formRationale}
                onChange={(e) => setFormRationale(e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder="Why are you making this decision?"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Expected ROI
              </label>
              <textarea
                value={formExpectedROI}
                onChange={(e) => setFormExpectedROI(e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder="What return do you expect?"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {submitting ? "Saving..." : "Save Decision"}
            </button>
          </form>
        </div>
      )}

      {/* Decisions List */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-gray-400">No decisions found</p>
      ) : (
        <div className="space-y-4">
          {filtered.map((d) => {
            const catStyle =
              CATEGORY_PILL_STYLES[d.category] || CATEGORY_PILL_STYLES.TOOL;
            const scopeStyle =
              SCOPE_COLORS[d.scope] || SCOPE_COLORS.PERSONAL;
            const statusStyle =
              STATUS_PILL_STYLES[d.status] || STATUS_PILL_STYLES.PLANNED;
            return (
              <div
                key={d.id}
                className="relative rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
              >
                {/* Delete button */}
                <button
                  onClick={() => handleDelete(d.id)}
                  className="absolute right-4 top-4 text-xs text-gray-400 hover:text-red-500"
                  title="Delete"
                >
                  {"✕"}
                </button>

                {/* Top row: Date | Category | Scope | Status | Amount */}
                <div className="mb-2 flex flex-wrap items-center gap-2 text-sm">
                  <span className="text-gray-500">
                    {new Date(d.date).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                  <span
                    className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${catStyle.bg} ${catStyle.text}`}
                  >
                    {DECISION_CATEGORY_LABELS[d.category] || d.category}
                  </span>
                  <span
                    className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${scopeStyle.bg} ${scopeStyle.text}`}
                  >
                    {d.scope.charAt(0) + d.scope.slice(1).toLowerCase()}
                  </span>
                  <span
                    className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyle.bg} ${statusStyle.text}`}
                  >
                    {DECISION_STATUS_LABELS[d.status] || d.status}
                  </span>
                  {d.amount !== null && (
                    <span className="font-medium text-gray-900">
                      {formatCurrency(d.amount)}
                    </span>
                  )}
                </div>

                {/* Title */}
                <p className="mb-2 font-semibold text-gray-900">{d.title}</p>

                {/* Business line */}
                {d.businessLine && (
                  <p className="mb-1 text-sm text-gray-500">
                    <span className="font-medium text-gray-600">
                      Business Line:
                    </span>{" "}
                    {d.businessLine.name}
                  </p>
                )}

                {/* Rationale */}
                {d.rationale && (
                  <p className="mb-1 text-sm italic text-gray-500">
                    <span className="font-medium not-italic text-gray-600">
                      Rationale:
                    </span>{" "}
                    {d.rationale}
                  </p>
                )}

                {/* Expected ROI */}
                {d.expectedROI && (
                  <p className="mb-1 text-sm italic text-gray-500">
                    <span className="font-medium not-italic text-gray-600">
                      Expected ROI:
                    </span>{" "}
                    {d.expectedROI}
                  </p>
                )}

                {/* Actual ROI */}
                {d.actualROI ? (
                  <p className="mt-2 text-sm text-gray-700">
                    <span className="font-medium text-gray-800">
                      Actual ROI:
                    </span>{" "}
                    {d.actualROI}
                  </p>
                ) : actualROIEditing === d.id ? (
                  <div className="mt-3 space-y-2">
                    <textarea
                      value={actualROIText}
                      onChange={(e) => setActualROIText(e.target.value)}
                      rows={2}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      placeholder="What was the actual ROI?"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleActualROISave(d.id)}
                        className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => {
                          setActualROIEditing(null);
                          setActualROIText("");
                        }}
                        className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-200"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setActualROIEditing(d.id);
                      setActualROIText("");
                    }}
                    className="mt-2 rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-200"
                  >
                    + Add Actual ROI
                  </button>
                )}

                {/* Status change buttons */}
                <div className="mt-3 flex flex-wrap gap-2">
                  {d.status === "PLANNED" && (
                    <button
                      onClick={() => handleStatusChange(d.id, "APPROVED")}
                      className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                    >
                      Approve
                    </button>
                  )}
                  {d.status === "APPROVED" && (
                    <>
                      <button
                        onClick={() => handleStatusChange(d.id, "DONE")}
                        className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700"
                      >
                        Mark Done
                      </button>
                      <button
                        onClick={() => handleStatusChange(d.id, "ABANDONED")}
                        className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
                      >
                        Abandon
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
