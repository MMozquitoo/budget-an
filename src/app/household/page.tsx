"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Plus, Trash2, X, ArrowLeft } from "lucide-react";
import {
  formatCurrency,
  getCurrentMonth,
  getCurrentYear,
  getMonthName,
  cn,
  GROUP_LABELS,
  GROUP_COLORS,
  CATEGORY_LABELS,
  CATEGORIES_BY_GROUP,
  GROUP_ORDER,
} from "@/lib/utils";

interface Transaction {
  id: string;
  date: string;
  amount: number;
  group: string;
  category: string;
  description: string;
  notes: string | null;
  recurring: boolean;
}

export default function TransactionsPage() {
  return (
    <Suspense fallback={
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    }>
      <TransactionsContent />
    </Suspense>
  );
}

function TransactionsContent() {
  const searchParams = useSearchParams();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [month, setMonth] = useState<number | null>(null);
  const [year, setYear] = useState<number | null>(null);
  const didBootstrap = useRef(false);
  // True once the month/year has been chosen explicitly (URL param or the user
  // touching a selector). Guards against the async /latest bootstrap overwriting
  // a month the user picked while it was still in flight.
  const monthChosen = useRef(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [filterGroup, setFilterGroup] = useState<string>("ALL");
  const [filterCategory, setFilterCategory] = useState<string>("ALL");

  // Form state
  const [formDate, setFormDate] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formGroup, setFormGroup] = useState<string>("VARIABLE_EXPENSE");
  const [formCategory, setFormCategory] = useState<string>("GROCERIES");
  const [formDescription, setFormDescription] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formRecurring, setFormRecurring] = useState(false);

  const fetchTransactions = () => {
    if (month === null || year === null) return;
    setLoading(true);
    setError(null);
    fetch(`/api/transactions?month=${month}&year=${year}`)
      .then((r) => {
        if (!r.ok) throw new Error(`API ${r.status}`);
        return r.json();
      })
      .then(setTransactions)
      .catch(() => {
        setTransactions([]);
        setError("Impossible de charger les opérations de ce mois.");
      })
      .finally(() => setLoading(false));
  };

  // Bootstrap the selected month/year once on mount: from the URL if present,
  // otherwise from the month of the latest transaction.
  useEffect(() => {
    if (didBootstrap.current) return;
    didBootstrap.current = true;

    const qMonth = searchParams.get("month");
    const qYear = searchParams.get("year");
    const qGroup = searchParams.get("group");
    const qCategory = searchParams.get("category");

    if (qGroup) setFilterGroup(qGroup);
    if (qCategory) setFilterCategory(qCategory);

    if (qMonth && qYear) {
      monthChosen.current = true;
      setMonth(Number(qMonth));
      setYear(Number(qYear));
      return;
    }

    fetch("/api/transactions/latest")
      .then((r) => r.json())
      .then((d) => {
        if (monthChosen.current) return; // user already picked — don't overwrite
        setMonth(d.month);
        setYear(d.year);
      })
      .catch(() => {
        if (monthChosen.current) return;
        setMonth(getCurrentMonth());
        setYear(getCurrentYear());
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refetch whenever the selected month/year changes.
  useEffect(() => {
    if (month === null || year === null) return;
    fetchTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, year]);

  useEffect(() => {
    const cats = CATEGORIES_BY_GROUP[formGroup];
    if (cats && cats.length > 0) {
      setFormCategory(cats[0]);
    }
  }, [formGroup]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: formDate,
          amount: Number(formAmount),
          group: formGroup,
          category: formCategory,
          description: formDescription,
          notes: formNotes || null,
          recurring: formRecurring,
        }),
      });
      if (res.ok) {
        setFormDate("");
        setFormAmount("");
        setFormDescription("");
        setFormNotes("");
        setFormRecurring(false);
        setShowForm(false);
        fetchTransactions();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/transactions?id=${id}`, { method: "DELETE" });
    fetchTransactions();
  };

  // Group totals always reflect the whole month, independent of the active filter.
  const groupTotals = GROUP_ORDER.reduce((acc, g) => {
    acc[g] = transactions
      .filter((t) => t.group === g)
      .reduce((sum, t) => sum + t.amount, 0);
    return acc;
  }, {} as Record<string, number>);

  const inGroup = filterGroup !== "ALL"
    ? transactions.filter((t) => t.group === filterGroup)
    : transactions;

  const filtered = filterCategory !== "ALL"
    ? inGroup.filter((t) => t.category === filterCategory)
    : inGroup;

  const total = filtered.reduce((sum, t) => sum + t.amount, 0);

  const activeCats = filterGroup !== "ALL"
    ? CATEGORIES_BY_GROUP[filterGroup] || []
    : [];

  const categoryTotals = activeCats.reduce((acc, cat) => {
    acc[cat] = inGroup
      .filter((t) => t.category === cat)
      .reduce((sum, t) => sum + t.amount, 0);
    return acc;
  }, {} as Record<string, number>);

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Opérations</h1>
          <p className="text-sm text-gray-500">
            Enregistre et classe tes revenus, dépenses et épargne
          </p>
        </div>
        <div className="flex gap-2">
          <select
            value={month ?? getCurrentMonth()}
            onChange={(e) => {
              monthChosen.current = true;
              setMonth(Number(e.target.value));
            }}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
          >
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {getMonthName(i + 1)}
              </option>
            ))}
          </select>
          <select
            value={year ?? getCurrentYear()}
            onChange={(e) => {
              monthChosen.current = true;
              setYear(Number(e.target.value));
            }}
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

      {/* Quick totals */}
      <div className="mb-6 grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
        {GROUP_ORDER.map((g) => {
          const colors = GROUP_COLORS[g];
          const amt = groupTotals[g] || 0;
          return (
            <button
              key={g}
              onClick={() => {
                setFilterCategory("ALL");
                setFilterGroup(filterGroup === g ? "ALL" : g);
              }}
              className={cn(
                "rounded-xl border p-4 text-left transition-all",
                filterGroup === g
                  ? cn(colors.bg, colors.border, "ring-2 ring-offset-1", `ring-current ${colors.text}`)
                  : "border-gray-200 bg-white hover:bg-gray-50"
              )}
            >
              <p className="text-xs font-medium text-gray-500 truncate">
                {GROUP_LABELS[g]}
              </p>
              <p className={cn("mt-1 text-lg font-bold", amt > 0 ? colors.text : "text-gray-300")}>
                {formatCurrency(amt)}
              </p>
            </button>
          );
        })}
      </div>

      {/* Category breakdown when group is selected */}
      {filterGroup !== "ALL" && activeCats.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-3">
            <button
              onClick={() => { setFilterGroup("ALL"); setFilterCategory("ALL"); }}
              className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800"
            >
              <ArrowLeft className="h-4 w-4" />
              Tous
            </button>
            <span className="text-sm text-gray-400">/</span>
            <span className="text-sm font-medium text-gray-700">
              {GROUP_LABELS[filterGroup]}
            </span>
            {filterCategory !== "ALL" && (
              <>
                <span className="text-sm text-gray-400">/</span>
                <span className="text-sm font-medium text-gray-900">
                  {CATEGORY_LABELS[filterCategory]}
                </span>
              </>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilterCategory("ALL")}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-xs font-medium transition-all",
                filterCategory === "ALL"
                  ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                  : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
              )}
            >
              Toutes ({inGroup.length})
            </button>
            {activeCats.map((cat) => {
              const catAmt = categoryTotals[cat] || 0;
              const catCount = inGroup.filter(t => t.category === cat).length;
              if (catCount === 0) return null;
              return (
                <button
                  key={cat}
                  onClick={() => setFilterCategory(filterCategory === cat ? "ALL" : cat)}
                  className={cn(
                    "rounded-lg border px-3 py-1.5 text-xs font-medium transition-all",
                    filterCategory === cat
                      ? cn(GROUP_COLORS[filterGroup].bg, GROUP_COLORS[filterGroup].border, GROUP_COLORS[filterGroup].text)
                      : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                  )}
                >
                  {CATEGORY_LABELS[cat]} ({catCount}) · {formatCurrency(catAmt)}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Add + List */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            {filterCategory !== "ALL" ? CATEGORY_LABELS[filterCategory] : filterGroup === "ALL" ? "Toutes les opérations" : GROUP_LABELS[filterGroup]}
            <span className="ml-2 text-sm font-normal text-gray-400">
              ({filtered.length}) &middot; Total: {formatCurrency(total)}
            </span>
          </h2>
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
                <X className="h-4 w-4" /> Annuler
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" /> Ajouter
              </>
            )}
          </button>
        </div>

        {/* Form */}
        {showForm && (
          <form
            onSubmit={handleAdd}
            className="mb-6 rounded-lg border border-gray-100 bg-gray-50 p-4"
          >
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
                  Montant
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
                  Groupe
                </label>
                <select
                  value={formGroup}
                  onChange={(e) => setFormGroup(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                >
                  {GROUP_ORDER.map((g) => (
                    <option key={g} value={g}>
                      {GROUP_LABELS[g]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Catégorie
                </label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                >
                  {(CATEGORIES_BY_GROUP[formGroup] || []).map((cat) => (
                    <option key={cat} value={cat}>
                      {CATEGORY_LABELS[cat]}
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
                  placeholder="Ex : Loyer juin"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Notes (optionnel)
                </label>
                <input
                  type="text"
                  placeholder="Détail supplémentaire..."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={formRecurring}
                  onChange={(e) => setFormRecurring(e.target.checked)}
                  className="rounded border-gray-300"
                />
                Récurrent
              </label>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-indigo-600 px-6 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {submitting ? "Enregistrement..." : "Enregistrer"}
              </button>
            </div>
          </form>
        )}

        {/* Table */}
        {loading ? (
          <div className="flex h-32 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
          </div>
        ) : error ? (
          <div className="py-8 text-center">
            <p className="text-sm text-red-600">{error}</p>
            <button
              onClick={fetchTransactions}
              className="mt-2 text-sm font-medium text-indigo-600 hover:text-indigo-800"
            >
              Réessayer
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-400">
            Aucune opération ce mois
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-gray-500">
                  <th className="pb-3 font-medium">Date</th>
                  <th className="pb-3 font-medium">Description</th>
                  <th className="pb-3 font-medium">Groupe</th>
                  <th className="pb-3 font-medium">Catégorie</th>
                  <th className="pb-3 text-right font-medium">Montant</th>
                  <th className="pb-3 text-right font-medium">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((t) => {
                  const colors = GROUP_COLORS[t.group] || GROUP_COLORS.VARIABLE_EXPENSE;
                  return (
                    <tr key={t.id}>
                      <td className="py-3 text-gray-500 whitespace-nowrap">
                        {new Date(t.date).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "short",
                        })}
                      </td>
                      <td className="py-3 text-gray-900">
                        {t.description}
                        {t.recurring && (
                          <span className="ml-1.5 text-xs text-gray-400">
                            (récurrent)
                          </span>
                        )}
                      </td>
                      <td className="py-3">
                        <span
                          className={cn(
                            "inline-block rounded-full px-2.5 py-0.5 text-xs font-medium",
                            colors.bg,
                            colors.text
                          )}
                        >
                          {GROUP_LABELS[t.group]}
                        </span>
                      </td>
                      <td className="py-3 text-gray-600">
                        {CATEGORY_LABELS[t.category] || t.category}
                      </td>
                      <td className={cn(
                        "py-3 text-right font-medium",
                        t.group === "INCOME" ? "text-emerald-600" : "text-gray-900"
                      )}>
                        {t.group === "INCOME" ? "+" : "-"}{formatCurrency(t.amount)}
                      </td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => handleDelete(t.id)}
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
