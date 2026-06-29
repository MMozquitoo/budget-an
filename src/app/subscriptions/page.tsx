"use client";

import { useEffect, useState } from "react";
import {
  formatCurrency,
  cn,
  GROUP_COLORS,
  GROUP_LABELS,
  CATEGORY_LABELS,
} from "@/lib/utils";
import { Repeat, Calendar, TrendingUp } from "lucide-react";

interface Transaction {
  id: string;
  date: string;
  amount: number;
  group: string;
  category: string;
  description: string;
  recurring: boolean;
}

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const SUBSCRIPTION_CATEGORIES = new Set([
    "SUBSCRIPTIONS", "INSURANCE", "UTILITIES", "INTERNET_PHONE",
    "TRANSPORT_FIXED", "RENT", "CREDIT_PAYMENT", "EDUCATION_FIXED",
    "INVESTMENT", "GENERAL_SAVINGS", "INSTALLMENT", "PENDING_PAYMENT",
  ]);

  useEffect(() => {
    fetch("/api/transactions?recurring=true")
      .then((r) => r.json())
      .then((data: Transaction[]) => {
        const fixed = data.filter((t) => SUBSCRIPTION_CATEGORIES.has(t.category));
        const seen = new Map<string, Transaction>();
        const sorted = [...fixed].sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        for (const t of sorted) {
          const key = t.description.toLowerCase().trim()
            .replace(/rum\s+\S+/gi, "rum")
            .replace(/\d{2}\/\d{2}\/\d{4}/g, "")
            .replace(/\s+/g, " ")
            .trim();
          if (!seen.has(key)) seen.set(key, t);
        }
        setSubscriptions(Array.from(seen.values()));
      })
      .finally(() => setLoading(false));
  }, []);

  const byCategory = subscriptions.reduce((acc, t) => {
    if (!acc[t.category]) acc[t.category] = [];
    acc[t.category].push(t);
    return acc;
  }, {} as Record<string, Transaction[]>);

  const monthlyTotal = subscriptions.reduce((sum, t) => sum + t.amount, 0);
  const yearlyTotal = monthlyTotal * 12;

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Abonnements</h1>
        <p className="text-sm text-gray-500">
          Tes charges récurrentes et projections
        </p>
      </div>

      {/* Summary cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-50 p-2">
              <Repeat className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Abonnements actifs</p>
              <p className="text-2xl font-bold text-gray-900">
                {subscriptions.length}
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-red-50 p-2">
              <Calendar className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Coût mensuel</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(monthlyTotal)}
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-amber-50 p-2">
              <TrendingUp className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Projection annuelle</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(yearlyTotal)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Subscriptions list by category */}
      {subscriptions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-12 text-center">
          <Repeat className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-4 text-lg font-semibold text-gray-600">
            Aucun abonnement
          </h3>
          <p className="mt-2 text-sm text-gray-400">
            Marque des transactions comme récurrentes dans Opérations pour les voir
            ici.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(byCategory)
            .sort(
              ([, a], [, b]) =>
                b.reduce((s, t) => s + t.amount, 0) -
                a.reduce((s, t) => s + t.amount, 0)
            )
            .map(([category, txns]) => {
              const catTotal = txns.reduce((s, t) => s + t.amount, 0);
              const group = txns[0]?.group || "FIXED_EXPENSE";
              const colors =
                GROUP_COLORS[group] || GROUP_COLORS.FIXED_EXPENSE;

              return (
                <div
                  key={category}
                  className="rounded-xl border border-gray-200 bg-white shadow-sm"
                >
                  <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                    <div className="flex items-center gap-3">
                      <span
                        className={cn(
                          "rounded-full px-3 py-1 text-xs font-medium",
                          colors.bg,
                          colors.text
                        )}
                      >
                        {CATEGORY_LABELS[category] || category}
                      </span>
                      <span className="text-sm text-gray-400">
                        {txns.length} service{txns.length > 1 ? "s" : ""}
                      </span>
                    </div>
                    <span className="font-semibold text-gray-900">
                      {formatCurrency(catTotal)}/mois
                    </span>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {txns.map((t) => (
                      <div
                        key={t.id}
                        className="flex items-center justify-between px-6 py-3"
                      >
                        <div>
                          <p className="text-sm font-medium text-gray-700">
                            {t.description}
                          </p>
                          <p className="text-xs text-gray-400">
                            Dernier prélèvement :{" "}
                            {new Date(t.date).toLocaleDateString("fr-FR", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </p>
                        </div>
                        <span className="text-sm font-medium text-gray-900">
                          {formatCurrency(t.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
