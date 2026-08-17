"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import type { Taxonomy } from "@/lib/taxonomy";
import { Plus, Trash2, Pencil, Check, X, Settings, Sparkles } from "lucide-react";

interface Rule {
  id: string;
  name: string;
  priority: number;
  matchField: string;
  matchType: string;
  matchValue: string;
  group: string;
  category: string;
  active: boolean;
}

interface Suggestion {
  payee: string;
  matchValue: string;
  group: string;
  category: string;
  count: number;
  samples: string[];
}

const MATCH_TYPES = [
  { value: "CONTAINS", label: "Contient" },
  { value: "STARTS_WITH", label: "Commence par" },
  { value: "ENDS_WITH", label: "Finit par" },
  { value: "EXACT", label: "Exact" },
  { value: "REGEX", label: "Regex" },
];

export default function RulesClient({
  rules,
  suggestions,
  taxonomy,
}: {
  rules: Rule[];
  suggestions: Suggestion[];
  taxonomy: Taxonomy;
}) {
  const { groupOrder: GROUP_ORDER, groupLabels: GROUP_LABELS, groupColors: GROUP_COLORS, categoryLabels: CATEGORY_LABELS, categoriesByGroup: CATEGORIES_BY_GROUP } = taxonomy;
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    priority: 0,
    matchType: "CONTAINS",
    matchValue: "",
    group: "VARIABLE_EXPENSE",
    category: "GROCERIES",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      await fetch(`/api/rules/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      setEditingId(null);
    } else {
      await fetch("/api/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, matchField: "description" }),
      });
    }
    setShowForm(false);
    setForm({ name: "", priority: 0, matchType: "CONTAINS", matchValue: "", group: "VARIABLE_EXPENSE", category: "GROCERIES" });
    router.refresh();
  };

  const handleEdit = (rule: Rule) => {
    setForm({
      name: rule.name,
      priority: rule.priority,
      matchType: rule.matchType,
      matchValue: rule.matchValue,
      group: rule.group,
      category: rule.category,
    });
    setEditingId(rule.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/rules?id=${id}`, { method: "DELETE" });
    router.refresh();
  };

  const handleToggle = async (rule: Rule) => {
    await fetch(`/api/rules/${rule.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !rule.active }),
    });
    router.refresh();
  };

  const cancelEdit = () => {
    setShowForm(false);
    setEditingId(null);
    setForm({ name: "", priority: 0, matchType: "CONTAINS", matchValue: "", group: "VARIABLE_EXPENSE", category: "GROCERIES" });
  };

  const createFromSuggestion = async (s: Suggestion) => {
    await fetch("/api/rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: `${CATEGORY_LABELS[s.category] || s.category} (auto)`,
        matchType: "CONTAINS",
        matchValue: s.matchValue,
        matchField: "description",
        group: s.group,
        category: s.category,
        priority: 0,
      }),
    });
    router.refresh();
  };

  const availableCategories = CATEGORIES_BY_GROUP[form.group] || [];

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Règles de classification
          </h1>
          <p className="text-sm text-gray-500">
            Catégorisation automatique à l&apos;import
          </p>
        </div>
        <button
          onClick={() => { cancelEdit(); setShowForm(true); }}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" />
          Nouvelle règle
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">
            {editingId ? "Modifier la règle" : "Nouvelle règle"}
          </h3>
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Nom</label>
              <input
                type="text"
                required
                placeholder="ex. Monoprix → Courses"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Type de recherche</label>
              <select
                value={form.matchType}
                onChange={(e) => setForm({ ...form, matchType: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                {MATCH_TYPES.map((mt) => (
                  <option key={mt.value} value={mt.value}>{mt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Valeur à chercher</label>
              <input
                type="text"
                required
                placeholder="ex. MONOPRIX"
                value={form.matchValue}
                onChange={(e) => setForm({ ...form, matchValue: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Groupe</label>
              <select
                value={form.group}
                onChange={(e) => {
                  const g = e.target.value;
                  const cats = CATEGORIES_BY_GROUP[g] || [];
                  setForm({ ...form, group: g, category: cats[0] || "" });
                }}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                {GROUP_ORDER.map((g) => (
                  <option key={g} value={g}>{GROUP_LABELS[g]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Catégorie</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                {availableCategories.map((c) => (
                  <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Priorité</label>
              <input
                type="number"
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="sm:col-span-3 flex gap-3">
              <button
                type="submit"
                className="rounded-lg bg-indigo-600 px-6 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              >
                {editingId ? "Mettre à jour" : "Créer la règle"}
              </button>
              <button
                type="button"
                onClick={cancelEdit}
                className="rounded-lg border border-gray-300 px-6 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Annuler
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Suggestions mined from repeated manual corrections */}
      {suggestions.length > 0 && (
        <div className="mb-6 rounded-xl border border-indigo-200 bg-indigo-50/50 p-5">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Sparkles className="h-5 w-5 text-indigo-600" />
            <h2 className="font-semibold text-gray-900">Règles suggérées</h2>
            <span className="text-xs text-gray-500">
              d&apos;après tes corrections manuelles répétées
            </span>
          </div>
          <div className="space-y-2">
            {suggestions.map((s) => (
              <div
                key={s.payee}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white p-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    «&nbsp;{s.matchValue}&nbsp;» → {GROUP_LABELS[s.group]} ·{" "}
                    {CATEGORY_LABELS[s.category] || s.category}
                  </p>
                  <p className="truncate text-xs text-gray-400">
                    {s.count} corrections · ex. {s.samples[0]}
                  </p>
                </div>
                <button
                  onClick={() => createFromSuggestion(s)}
                  className="flex flex-shrink-0 items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
                >
                  <Check className="h-4 w-4" /> Créer la règle
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rules list */}
      {rules.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-12 text-center">
          <Settings className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-4 text-lg font-semibold text-gray-600">
            Aucune règle de classification
          </h3>
          <p className="mt-2 text-sm text-gray-400">
            Crée des règles pour classifier automatiquement tes transactions lors de l&apos;import bancaire.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium text-gray-500">Nom</th>
                  <th className="px-4 py-3 font-medium text-gray-500">Recherche</th>
                  <th className="px-4 py-3 font-medium text-gray-500">Affecté à</th>
                  <th className="px-4 py-3 font-medium text-gray-500 text-center">Priorité</th>
                  <th className="px-4 py-3 font-medium text-gray-500 text-center">Statut</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rules.map((rule) => {
                  const colors = GROUP_COLORS[rule.group] || GROUP_COLORS.VARIABLE_EXPENSE;
                  const matchLabel = MATCH_TYPES.find((m) => m.value === rule.matchType)?.label || rule.matchType;
                  return (
                    <tr key={rule.id} className={cn("hover:bg-gray-50", !rule.active && "opacity-50")}>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {rule.name}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-gray-400 text-xs">{matchLabel}: </span>
                        <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-mono text-gray-700">
                          {rule.matchValue}
                        </code>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", colors.bg, colors.text)}>
                          {GROUP_LABELS[rule.group]}
                        </span>
                        <span className="ml-2 text-xs text-gray-500">
                          {CATEGORY_LABELS[rule.category]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-gray-500">
                        {rule.priority}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleToggle(rule)}
                          className={cn(
                            "rounded-full px-3 py-1 text-xs font-medium",
                            rule.active
                              ? "bg-emerald-50 text-emerald-600"
                              : "bg-gray-100 text-gray-400"
                          )}
                        >
                          {rule.active ? "Active" : "Inactive"}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleEdit(rule)}
                            className="rounded p-1 text-gray-300 hover:text-indigo-500"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(rule.id)}
                            className="rounded p-1 text-gray-300 hover:text-red-500"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
