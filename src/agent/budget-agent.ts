import { tool } from "ai";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { TransactionGroup, TransactionCategory } from "@/generated/prisma/client";
import {
  GROUP_LABELS,
  CATEGORY_LABELS,
  CATEGORIES_BY_GROUP,
  GROUP_ORDER,
} from "@/lib/utils";

const groupEnum = z.enum(GROUP_ORDER as unknown as [string, ...string[]]);
const allCategories = Object.values(CATEGORIES_BY_GROUP).flat();
const categoryEnum = z.enum(allCategories as unknown as [string, ...string[]]);

export const SYSTEM_PROMPT = `Tu es l'assistant financier personnel d'Adrien Naeem. Réponds toujours en français. Sois direct et concis.
Date du jour : ${new Date().toISOString().slice(0, 10)}. Année en cours : ${new Date().getFullYear()}. Mois en cours : ${new Date().getMonth() + 1}.

DONNÉES : Transactions bancaires de Boursorama, N26, SG, Revolut, LCL, CIC.
Groupes : ${GROUP_ORDER.map((g) => `${g} (${GROUP_LABELS[g]})`).join(", ")}
Adrien a des investissements immobiliers (LCL appartement, Abondant, SCPI Pierre) → SAVINGS/INVESTMENT.
Les virements entre comptes d'Adrien ou de sa femme Claudia Andrea Rodriguez = transferts internes, ne pas compter.

STYLE DE RÉPONSE :
- Va droit au résultat. Pas de "laisse-moi chercher" ni "je vais consulter". Montre directement les données.
- Montants toujours en € avec format clair
- Utilise des tableaux markdown pour les données tabulaires
- Maximum 2-3 lignes de commentaire après les données
- Pas d'emojis excessifs. Maximum 1-2 par réponse
- Si une transaction semble mal classée, mentionne brièvement ce que tu corrigerais
- Pour reclassifier, utilise l'outil reclassify sans demander de confirmation inutile
- Si la limite de 50 ne suffit pas, fais une deuxième query pour compléter`;

export const budgetTools = {
  queryTransactions: tool({
    description:
      "Chercher des transactions avec filtres. Pour répondre aux questions sur les dépenses, revenus, etc.",
    inputSchema: z.object({
      month: z.number().optional().describe("Mois (1-12)"),
      year: z.number().optional().describe("Année (ex: 2025)"),
      group: groupEnum.optional().describe("Groupe de transaction"),
      category: categoryEnum.optional().describe("Catégorie"),
      search: z.string().optional().describe("Rechercher dans la description"),
      limit: z.number().optional().default(50).describe("Nombre max de résultats"),
    }),
    execute: async ({ month, year, group, category, search, limit }) => {
      const where: Record<string, unknown> = {};
      if (month && year) {
        where.date = { gte: new Date(year, month - 1, 1), lte: new Date(year, month, 0, 23, 59, 59) };
      } else if (year) {
        where.date = { gte: new Date(year, 0, 1), lte: new Date(year, 11, 31, 23, 59, 59) };
      }
      if (group) where.group = group;
      if (category) where.category = category;
      if (search) where.description = { contains: search, mode: "insensitive" };

      const transactions = await prisma.personalTransaction.findMany({
        where, orderBy: { date: "desc" }, take: limit,
      });
      return transactions.map((t) => ({
        id: t.id, date: t.date.toISOString().slice(0, 10), amount: Number(t.amount),
        group: t.group, groupLabel: GROUP_LABELS[t.group],
        category: t.category, categoryLabel: CATEGORY_LABELS[t.category],
        description: t.description, recurring: t.recurring,
      }));
    },
  }),

  getSummary: tool({
    description: "Obtenir le résumé financier d'un mois : totaux par groupe, solde, taux d'épargne",
    inputSchema: z.object({
      month: z.number().describe("Mois (1-12)"),
      year: z.number().describe("Année"),
    }),
    execute: async ({ month, year }) => {
      const transactions = await prisma.personalTransaction.findMany({
        where: { date: { gte: new Date(year, month - 1, 1), lte: new Date(year, month, 0, 23, 59, 59) }, parentId: null },
      });
      const byGroup: Record<string, number> = {};
      const byCategory: Record<string, number> = {};
      for (const t of transactions) {
        const amt = Number(t.amount);
        byGroup[t.group] = (byGroup[t.group] || 0) + amt;
        byCategory[t.category] = (byCategory[t.category] || 0) + amt;
      }
      const income = byGroup["INCOME"] || 0;
      const expenses = (byGroup["FIXED_EXPENSE"] || 0) + (byGroup["VARIABLE_EXPENSE"] || 0) + (byGroup["UNEXPECTED"] || 0);
      const savings = byGroup["SAVINGS"] || 0;
      return {
        month, year, transactionCount: transactions.length, income, expenses, savings,
        balance: income - expenses - savings,
        savingsRate: income > 0 ? ((savings / income) * 100).toFixed(1) + "%" : "0%",
        byGroup: Object.entries(byGroup).map(([g, total]) => ({ group: g, label: GROUP_LABELS[g], total })),
        topCategories: Object.entries(byCategory).sort(([, a], [, b]) => b - a).slice(0, 10)
          .map(([cat, total]) => ({ category: cat, label: CATEGORY_LABELS[cat], total })),
      };
    },
  }),

  getTrends: tool({
    description: "Voir les tendances de dépenses/revenus sur les N derniers mois",
    inputSchema: z.object({
      months: z.number().default(6).describe("Nombre de mois en arrière"),
    }),
    execute: async ({ months }) => {
      const latest = await prisma.personalTransaction.findFirst({ orderBy: { date: "desc" }, select: { date: true } });
      if (!latest) return { message: "Aucune donnée" };
      const end = new Date(latest.date);
      const startDate = new Date(end.getFullYear(), end.getMonth() - months + 1, 1);
      const transactions = await prisma.personalTransaction.findMany({
        where: { date: { gte: startDate }, parentId: null }, orderBy: { date: "asc" },
      });
      const byMonth: Record<string, { income: number; expenses: number; savings: number }> = {};
      for (const t of transactions) {
        const d = new Date(t.date);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        if (!byMonth[key]) byMonth[key] = { income: 0, expenses: 0, savings: 0 };
        const amt = Number(t.amount);
        if (t.group === "INCOME") byMonth[key].income += amt;
        else if (t.group === "SAVINGS") byMonth[key].savings += amt;
        else byMonth[key].expenses += amt;
      }
      return Object.entries(byMonth).sort(([a], [b]) => a.localeCompare(b))
        .map(([month, data]) => ({ month, ...data, balance: data.income - data.expenses - data.savings }));
    },
  }),

  reclassify: tool({
    description: "Changer la classification (groupe et catégorie) d'une transaction",
    inputSchema: z.object({
      transactionId: z.string().describe("ID de la transaction"),
      group: groupEnum.describe("Nouveau groupe"),
      category: categoryEnum.describe("Nouvelle catégorie"),
    }),
    execute: async ({ transactionId, group, category }) => {
      const validCategories = CATEGORIES_BY_GROUP[group] || [];
      if (!validCategories.includes(category)) {
        return { error: `${category} n'appartient pas au groupe ${group}. Valides : ${validCategories.join(", ")}` };
      }
      const updated = await prisma.personalTransaction.update({
        where: { id: transactionId },
        data: { group: group as TransactionGroup, category: category as TransactionCategory },
      });
      return { success: true, id: updated.id, description: updated.description,
        newGroup: GROUP_LABELS[updated.group], newCategory: CATEGORY_LABELS[updated.category] };
    },
  }),

  getSubscriptions: tool({
    description: "Lister les abonnements et charges récurrentes fixes",
    inputSchema: z.object({}),
    execute: async () => {
      const FIXED_CATS: TransactionCategory[] = [
        "SUBSCRIPTIONS", "INSURANCE", "UTILITIES", "INTERNET_PHONE", "TRANSPORT_FIXED", "RENT", "INVESTMENT",
      ];
      const txns = await prisma.personalTransaction.findMany({
        where: { recurring: true, category: { in: FIXED_CATS } }, orderBy: { date: "desc" },
      });
      const seen = new Map<string, { description: string; amount: number; category: string; group: string; lastDate: string }>();
      for (const t of txns) {
        const key = t.description.toLowerCase().trim();
        if (!seen.has(key)) {
          seen.set(key, { description: t.description, amount: Number(t.amount),
            category: CATEGORY_LABELS[t.category], group: GROUP_LABELS[t.group],
            lastDate: t.date.toISOString().slice(0, 10) });
        }
      }
      const subs = Array.from(seen.values());
      const monthlyTotal = subs.reduce((s, t) => s + t.amount, 0);
      return { count: subs.length, monthlyTotal, yearlyTotal: monthlyTotal * 12, subscriptions: subs };
    },
  }),

  getNetWorth: tool({
    description: "Voir le patrimoine net et son évolution",
    inputSchema: z.object({}),
    execute: async () => {
      const snapshots = await prisma.netWorthSnapshot.findMany({ orderBy: [{ year: "asc" }, { month: "asc" }] });
      return snapshots.map((s) => {
        const cash = Number(s.cash), savings = Number(s.savings), investments = Number(s.investments);
        const property = Number(s.property), debt = Number(s.debt);
        return { period: `${s.year}-${String(s.month).padStart(2, "0")}`, cash, savings, investments, property, debt,
          total: cash + savings + investments + property - debt };
      });
    },
  }),

  deleteTransaction: tool({
    description: "Supprimer une transaction (ex : virement interne qui ne devrait pas figurer)",
    inputSchema: z.object({
      transactionId: z.string().describe("ID de la transaction à supprimer"),
      reason: z.string().describe("Raison de la suppression"),
    }),
    execute: async ({ transactionId, reason }) => {
      const t = await prisma.personalTransaction.findUnique({ where: { id: transactionId } });
      if (!t) return { error: "Transaction non trouvée" };
      await prisma.personalTransaction.delete({ where: { id: transactionId } });
      return { success: true, deleted: { description: t.description, amount: Number(t.amount),
        date: t.date.toISOString().slice(0, 10) }, reason };
    },
  }),
};
