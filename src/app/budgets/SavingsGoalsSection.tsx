"use client";

import { useEffect, useState, useCallback } from "react";
import { formatCurrency, cn, CATEGORY_LABELS, CATEGORIES_BY_GROUP } from "@/lib/utils";
import { PiggyBank, Trash2, Plus } from "lucide-react";

interface SavingsGoalLine {
  id: string;
  name: string;
  targetAmount: number;
  targetDate: string;
  startDate: string;
  category: string | null;
  saved: number;
  remaining: number;
  pct: number;
  health: "met" | "on-track" | "behind" | "overdue";
  daysRemaining: number;
}

const GOAL_HEALTH: Record<SavingsGoalLine["health"], { bar: string; text: string; label: string }> = {
  met:        { bar: "bg-emerald-500", text: "text-emerald-600", label: "Atteint" },
  "on-track": { bar: "bg-blue-500",    text: "text-blue-600",    label: "Sur la bonne voie" },
  behind:     { bar: "bg-amber-500",   text: "text-amber-600",   label: "En retard" },
  overdue:    { bar: "bg-red-500",     text: "text-red-600",     label: "Échéance dépassée" },
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

export default function SavingsGoalsSection() {
  const [goals, setGoals] = useState<SavingsGoalLine[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newCategory, setNewCategory] = useState("");

  const fetchData = useCallback(() => {
    setLoading(true);
    fetch("/api/savings-goals")
      .then((r) => r.json())
      .then((data) => setGoals(data.goals ?? []))
      .catch(() => setGoals(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const updateAmount = async (id: string, targetAmount: number) => {
    await fetch(`/api/savings-goals/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetAmount }),
    });
    fetchData();
  };

  const deleteGoal = async (id: string) => {
    await fetch(`/api/savings-goals/${id}`, { method: "DELETE" });
    fetchData();
  };

  const addGoal = async () => {
    const amount = Number(newAmount);
    if (!newName.trim() || !Number.isFinite(amount) || amount <= 0 || !newDate) return;
    await fetch("/api/savings-goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newName.trim(),
        targetAmount: amount,
        targetDate: newDate,
        category: newCategory || undefined,
      }),
    });
    setNewName("");
    setNewAmount("");
    setNewDate("");
    setNewCategory("");
    fetchData();
  };

  return (
    <div className="mt-10">
      <div className="mb-4">
        <h2 className="text-lg font-bold text-gray-900">Objectifs d&apos;épargne</h2>
        <p className="text-sm text-gray-500">
          Un montant à atteindre pour une date, suivi depuis tes transactions d&apos;épargne.
        </p>
      </div>

      {loading ? (
        <div className="flex h-32 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
        </div>
      ) : (
        <>
          {goals && goals.length > 0 && (
            <div className="mb-6 space-y-3">
              {goals.map((g) => {
                const h = GOAL_HEALTH[g.health];
                return (
                  <div key={g.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-gray-900">{g.name}</p>
                        <p className="text-xs text-gray-400">
                          {g.category ? CATEGORY_LABELS[g.category] || g.category : "Épargne (toutes catégories)"}
                          {" · "}
                          Échéance {formatDate(g.targetDate)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 whitespace-nowrap">
                        <span className={cn("text-sm font-semibold", h.text)}>
                          {formatCurrency(g.saved)}
                        </span>
                        <span className="text-sm text-gray-400">/</span>
                        <input
                          type="number"
                          defaultValue={g.targetAmount}
                          onBlur={(e) => {
                            const v = Number(e.target.value);
                            if (Number.isFinite(v) && v > 0 && v !== g.targetAmount) updateAmount(g.id, v);
                          }}
                          className="w-24 rounded-md border border-gray-200 px-2 py-1 text-right text-sm"
                        />
                        <button
                          onClick={() => deleteGoal(g.id)}
                          className="rounded p-1 text-gray-300 hover:text-red-500"
                          title="Supprimer cet objectif"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                      <div
                        className={cn("h-full rounded-full transition-all", h.bar)}
                        style={{ width: `${Math.min(Math.max(g.pct, 0), 100)}%` }}
                      />
                    </div>
                    <div className="mt-1.5 flex items-center justify-between text-xs">
                      <span className={h.text}>{h.label} · {Math.round(g.pct)}%</span>
                      <span className="text-gray-500">
                        {g.remaining > 0
                          ? `${formatCurrency(g.remaining)} restants${g.daysRemaining >= 0 ? ` · ${g.daysRemaining} j` : ` · en retard de ${-g.daysRemaining} j`}`
                          : "Objectif atteint"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Add a goal */}
          <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="mb-3 text-sm font-semibold text-gray-700">Ajouter un objectif</p>
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-[160px]">
                <label className="mb-1 block text-xs font-medium text-gray-500">Nom</label>
                <input
                  type="text"
                  placeholder="Voyage Japon"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">Montant cible (€)</label>
                <input
                  type="number"
                  step="1"
                  placeholder="10000"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  className="w-28 rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">Échéance</label>
                <input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="min-w-[180px]">
                <label className="mb-1 block text-xs font-medium text-gray-500">Catégorie</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="">Général (toute l&apos;épargne)</option>
                  {CATEGORIES_BY_GROUP.SAVINGS.map((c) => (
                    <option key={c} value={c}>{CATEGORY_LABELS[c] || c}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={addGoal}
                disabled={!newName.trim() || newAmount === "" || !newDate}
                className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                Ajouter
              </button>
            </div>
          </div>

          {/* Empty state */}
          {goals && goals.length === 0 && (
            <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-12 text-center">
              <PiggyBank className="mx-auto h-12 w-12 text-gray-300" />
              <h3 className="mt-4 text-lg font-semibold text-gray-600">Aucun objectif d&apos;épargne</h3>
              <p className="mt-2 text-sm text-gray-400">
                Ajoute un montant à atteindre pour une date, comme &laquo;&nbsp;10&nbsp;000€ pour décembre&nbsp;&raquo;.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
