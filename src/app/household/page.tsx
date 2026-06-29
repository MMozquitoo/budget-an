"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, X, Filter } from "lucide-react";
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
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [month, setMonth] = useState<number | null>(null);
  const [year, setYear] = useState<number | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [filterGroup, setFilterGroup] = useState<string>("ALL");

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
    const groupParam = filterGroup !== "ALL" ? `&group=${filterGroup}` : "";
    fetch(`/api/transactions?month=${month}&year=${year}${groupParam}`)
      .then((r) => {
        if (!r.ok) throw new Error("API error");
        return r.json();
      })
      .then(setTransactions)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!initialized) {
      fetch("/api/transactions/latest")
        .then((r) => r.json())
        .then((d) => {
          setMonth(d.month);
          setYear(d.year);
          setInitialized(true);
        })
        .catch(() => {
          setMonth(getCurrentMonth());
          setYear(getCurrentYear());
          setInitialized(true);
        });
      return;
    }
    fetchTransactions();
  }, [month, year, filterGroup, initialized]);

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

  const total = transactions.reduce((sum, t) => sum + t.amount, 0);

  const groupTotals = GROUP_ORDER.reduce((acc, g) => {
    acc[g] = transactions
      .filter((t) => t.group === g)
      .reduce((sum, t) => sum + t.amount, 0);
    return acc;
  }, {} as Record<string, number>);

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Movimientos</h1>
          <p className="text-sm text-gray-500">
            Registra y clasifica tus ingresos, gastos y ahorro
          </p>
        </div>
        <div className="flex gap-2">
          <select
            value={month ?? getCurrentMonth()}
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
            value={year ?? getCurrentYear()}
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

      {/* Quick totals */}
      <div className="mb-6 grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
        {GROUP_ORDER.map((g) => {
          const colors = GROUP_COLORS[g];
          const amt = groupTotals[g] || 0;
          return (
            <button
              key={g}
              onClick={() => setFilterGroup(filterGroup === g ? "ALL" : g)}
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

      {/* Filter indicator */}
      {filterGroup !== "ALL" && (
        <div className="mb-4 flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-400" />
          <span className="text-sm text-gray-500">
            Filtrando por: <strong>{GROUP_LABELS[filterGroup]}</strong>
          </span>
          <button
            onClick={() => setFilterGroup("ALL")}
            className="text-sm text-indigo-600 hover:text-indigo-800"
          >
            Quitar filtro
          </button>
        </div>
      )}

      {/* Add + List */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            {filterGroup === "ALL" ? "Todos los movimientos" : GROUP_LABELS[filterGroup]}
            <span className="ml-2 text-sm font-normal text-gray-400">
              ({transactions.length}) &middot; Total: {formatCurrency(total)}
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
                <X className="h-4 w-4" /> Cancelar
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" /> Agregar
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
                  Fecha
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
                  Monto
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
                  Grupo
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
                  Categoría
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
                  Descripción
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Arriendo junio"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Notas (opcional)
                </label>
                <input
                  type="text"
                  placeholder="Detalle adicional..."
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
                Recurrente
              </label>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-indigo-600 px-6 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {submitting ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </form>
        )}

        {/* Table */}
        {loading ? (
          <div className="flex h-32 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
          </div>
        ) : transactions.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-400">
            No hay movimientos este mes
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-gray-500">
                  <th className="pb-3 font-medium">Fecha</th>
                  <th className="pb-3 font-medium">Descripción</th>
                  <th className="pb-3 font-medium">Grupo</th>
                  <th className="pb-3 font-medium">Categoría</th>
                  <th className="pb-3 text-right font-medium">Monto</th>
                  <th className="pb-3 text-right font-medium">
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {transactions.map((t) => {
                  const colors = GROUP_COLORS[t.group] || GROUP_COLORS.VARIABLE_EXPENSE;
                  return (
                    <tr key={t.id}>
                      <td className="py-3 text-gray-500 whitespace-nowrap">
                        {new Date(t.date).toLocaleDateString("es", {
                          day: "numeric",
                          month: "short",
                        })}
                      </td>
                      <td className="py-3 text-gray-900">
                        {t.description}
                        {t.recurring && (
                          <span className="ml-1.5 text-xs text-gray-400">
                            (recurrente)
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
