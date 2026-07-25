"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency, cn, CATEGORY_LABELS, CATEGORIES_BY_GROUP, GROUP_LABELS, GROUP_ORDER } from "@/lib/utils";
import { Wallet, Sparkles, Copy, Trash2, Plus, AlertTriangle } from "lucide-react";

interface BudgetLine {
  category: string;
  group: string;
  direction: "cap" | "goal";
  budget: number;
  actual: number;
  remaining: number;
  pct: number;
  health: "ok" | "warning" | "over" | "behind" | "close" | "met";
}

interface BudgetReport {
  month: number;
  year: number;
  lines: BudgetLine[];
  totalBudget: number;
  totalActual: number;
  unbudgetedSpend: number;
  overCount: number;
}

const MONTH_NAMES = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

// Budgetable categories = everything except income, in canonical group order.
const BUDGETABLE = GROUP_ORDER.filter((g) => g !== "INCOME").flatMap((g) =>
  (CATEGORIES_BY_GROUP[g] || []).map((c) => ({ category: c, group: g }))
);

const HEALTH: Record<BudgetLine["health"], { bar: string; text: string; label: string }> = {
  ok:      { bar: "bg-emerald-500", text: "text-emerald-600", label: "OK" },
  warning: { bar: "bg-amber-500",   text: "text-amber-600",   label: "Proche" },
  over:    { bar: "bg-red-500",     text: "text-red-600",     label: "Dépassé" },
  met:     { bar: "bg-emerald-500", text: "text-emerald-600", label: "Atteint" },
  close:   { bar: "bg-amber-500",   text: "text-amber-600",   label: "Presque" },
  behind:  { bar: "bg-violet-400",  text: "text-violet-600",  label: "En cours" },
};

export default function BudgetsClient({
  report,
  month,
  year,
}: {
  report: BudgetReport;
  month: number;
  year: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [lookback, setLookback] = useState(6);
  const [newCat, setNewCat] = useState("");
  const [newAmount, setNewAmount] = useState("");

  const saveBudget = async (category: string, amount: number) => {
    await fetch("/api/budgets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ month, year, category, amount }),
    });
    router.refresh();
  };

  const deleteBudget = async (category: string) => {
    await fetch(`/api/budgets?month=${month}&year=${year}&category=${category}`, { method: "DELETE" });
    router.refresh();
  };

  const prefill = async () => {
    setBusy(true);
    try {
      const res = await fetch(`/api/budgets/suggest?months=${lookback}&month=${month}&year=${year}`).then((r) => r.json());
      const budgets = Object.entries(res.suggestions || {}).map(([category, amount]) => ({ category, amount }));
      if (budgets.length === 0) return;
      await fetch("/api/budgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month, year, budgets }),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  const copyPrevious = async () => {
    setBusy(true);
    try {
      const fromMonth = month === 1 ? 12 : month - 1;
      const fromYear = month === 1 ? year - 1 : year;
      await fetch("/api/budgets/copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromMonth, fromYear, toMonth: month, toYear: year }),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  const addBudget = async () => {
    const amount = Number(newAmount);
    if (!newCat || !Number.isFinite(amount) || amount < 0) return;
    await saveBudget(newCat, amount);
    setNewCat("");
    setNewAmount("");
  };

  const budgetedCats = new Set(report.lines.map((l) => l.category));
  const availableCats = BUDGETABLE.filter((c) => !budgetedCats.has(c.category));

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Budgets</h1>
          <p className="text-sm text-gray-500">
            Un plafond par poste (objectif pour l&apos;épargne), suivi en direct sur le mois.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={month}
            onChange={(e) => router.push(`/budgets?month=${e.target.value}&year=${year}`)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            {MONTH_NAMES.map((m, i) => (
              <option key={i} value={i + 1}>{m}</option>
            ))}
          </select>
          <input
            type="number"
            value={year}
            onChange={(e) => router.push(`/budgets?month=${month}&year=${e.target.value}`)}
            className="w-24 rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white p-1 shadow-sm">
          <button
            onClick={prefill}
            disabled={busy}
            className="flex items-center gap-2 rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            <Sparkles className="h-4 w-4" />
            Pré-remplir
          </button>
          <select
            value={lookback}
            onChange={(e) => setLookback(Number(e.target.value))}
            className="rounded-md border border-gray-200 px-2 py-1.5 text-sm text-gray-600"
          >
            <option value={6}>6 mois</option>
            <option value={9}>9 mois</option>
          </select>
        </div>
        <button
          onClick={copyPrevious}
          disabled={busy}
          className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          <Copy className="h-4 w-4" />
          Copier le mois précédent
        </button>
      </div>

      {/* KPIs */}
      {report.lines.length > 0 && (
        <div className="mb-6 grid gap-4 sm:grid-cols-4">
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-xs text-gray-500">Budget total</p>
            <p className="text-xl font-bold text-gray-900">{formatCurrency(report.totalBudget)}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-xs text-gray-500">Dépensé / épargné</p>
            <p className="text-xl font-bold text-gray-900">{formatCurrency(report.totalActual)}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-xs text-gray-500">Dépassements</p>
            <p className={cn("text-xl font-bold", report.overCount > 0 ? "text-red-600" : "text-emerald-600")}>
              {report.overCount}
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-xs text-gray-500">Hors budget</p>
            <p className={cn("text-xl font-bold", report.unbudgetedSpend > 0 ? "text-amber-600" : "text-gray-900")}>
              {formatCurrency(report.unbudgetedSpend)}
            </p>
          </div>
        </div>
      )}

      {/* Progress list */}
      {report.lines.length > 0 && (
        <div className="mb-6 space-y-3">
          {report.lines.map((l) => {
            const h = HEALTH[l.health];
            return (
              <div key={l.category} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-gray-900">
                      {CATEGORY_LABELS[l.category] || l.category}
                    </p>
                    <p className="text-xs text-gray-400">{GROUP_LABELS[l.group]}</p>
                  </div>
                  <div className="flex items-center gap-2 whitespace-nowrap">
                    <span className={cn("text-sm font-semibold", h.text)}>
                      {formatCurrency(l.actual)}
                    </span>
                    <span className="text-sm text-gray-400">/</span>
                    <input
                      type="number"
                      defaultValue={l.budget}
                      onBlur={(e) => {
                        const v = Number(e.target.value);
                        if (Number.isFinite(v) && v >= 0 && v !== l.budget) saveBudget(l.category, v);
                      }}
                      className="w-20 rounded-md border border-gray-200 px-2 py-1 text-right text-sm"
                    />
                    <button
                      onClick={() => deleteBudget(l.category)}
                      className="rounded p-1 text-gray-300 hover:text-red-500"
                      title="Supprimer ce budget"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                  <div
                    className={cn("h-full rounded-full transition-all", h.bar)}
                    style={{ width: `${Math.min(l.pct, 100)}%` }}
                  />
                </div>
                <div className="mt-1.5 flex items-center justify-between text-xs">
                  <span className={h.text}>{h.label} · {l.pct}%</span>
                  <span className="text-gray-500">
                    {l.direction === "cap"
                      ? l.remaining >= 0
                        ? `${formatCurrency(l.remaining)} restants`
                        : `${formatCurrency(-l.remaining)} de dépassement`
                      : l.remaining > 0
                        ? `${formatCurrency(l.remaining)} pour atteindre l'objectif`
                        : "Objectif atteint"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add a budget */}
      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <p className="mb-3 text-sm font-semibold text-gray-700">Ajouter un budget</p>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <label className="mb-1 block text-xs font-medium text-gray-500">Catégorie</label>
            <select
              value={newCat}
              onChange={(e) => setNewCat(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">Choisir…</option>
              {availableCats.map((c) => (
                <option key={c.category} value={c.category}>
                  {GROUP_LABELS[c.group]} — {CATEGORY_LABELS[c.category] || c.category}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Montant (€)</label>
            <input
              type="number"
              step="1"
              placeholder="0"
              value={newAmount}
              onChange={(e) => setNewAmount(e.target.value)}
              className="w-28 rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <button
            onClick={addBudget}
            disabled={!newCat || newAmount === ""}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            Ajouter
          </button>
        </div>
      </div>

      {/* Empty state */}
      {report.lines.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-12 text-center">
          <Wallet className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-4 text-lg font-semibold text-gray-600">
            Aucun budget pour {MONTH_NAMES[month - 1]} {year}
          </h3>
          <p className="mt-2 text-sm text-gray-400">
            Pré-remplis à partir de tes {lookback} derniers mois, copie le mois précédent, ou ajoute un budget à la main.
          </p>
        </div>
      )}

      {report.unbudgetedSpend > 0 && report.lines.length > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>
            {formatCurrency(report.unbudgetedSpend)} dépensés dans des catégories sans budget ce mois-ci.
          </span>
        </div>
      )}
    </div>
  );
}
