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

export const SYSTEM_PROMPT = `Eres el asistente financiero de Adrien Naeem. Siempre en español. Sé directo y breve.
Fecha: ${new Date().toISOString().slice(0, 10)}. Año actual: ${new Date().getFullYear()}. Mes actual: ${new Date().getMonth() + 1}.

DATOS: Transacciones bancarias de Boursorama, N26, SG, Revolut, LCL, CIC.
Grupos: ${GROUP_ORDER.map((g) => `${g} (${GROUP_LABELS[g]})`).join(", ")}
Adrien tiene inversiones inmobiliarias (LCL appartement, Abondant, SCPI Pierre) → SAVINGS/INVESTMENT.
Transferencias entre cuentas de Adrien o Claudia Andrea Rodriguez = internas, no contar.

ESTILO DE RESPUESTA:
- Ve directo al dato. Nada de "déjame consultar" ni "voy a buscar". Solo muestra el resultado.
- Números siempre con € y formato claro
- Usa tablas markdown para datos tabulares
- Máximo 2-3 líneas de comentario después de los datos
- No uses emojis excesivos. Máximo 1-2 por respuesta
- Si algo parece mal clasificado, menciona brevemente qué corregirías
- Para reclasificar, usa la herramienta reclassify sin pedir confirmación extra innecesaria
- Si el limit de 50 no basta, haz una segunda query para completar los datos`;

export const budgetTools = {
  queryTransactions: tool({
    description:
      "Buscar transacciones con filtros. Usa para responder preguntas sobre gastos, ingresos, etc.",
    inputSchema: z.object({
      month: z.number().optional().describe("Mes (1-12)"),
      year: z.number().optional().describe("Año (ej: 2025)"),
      group: groupEnum.optional().describe("Grupo de transacción"),
      category: categoryEnum.optional().describe("Categoría"),
      search: z.string().optional().describe("Buscar en descripción"),
      limit: z.number().optional().default(50).describe("Máximo de resultados"),
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
    description: "Obtener resumen financiero de un mes: totales por grupo, balance, tasa de ahorro",
    inputSchema: z.object({
      month: z.number().describe("Mes (1-12)"),
      year: z.number().describe("Año"),
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
    description: "Ver tendencias de gastos/ingresos en los últimos N meses",
    inputSchema: z.object({
      months: z.number().default(6).describe("Número de meses hacia atrás"),
    }),
    execute: async ({ months }) => {
      const latest = await prisma.personalTransaction.findFirst({ orderBy: { date: "desc" }, select: { date: true } });
      if (!latest) return { message: "No hay datos" };
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
    description: "Cambiar la clasificación (grupo y categoría) de una transacción",
    inputSchema: z.object({
      transactionId: z.string().describe("ID de la transacción"),
      group: groupEnum.describe("Nuevo grupo"),
      category: categoryEnum.describe("Nueva categoría"),
    }),
    execute: async ({ transactionId, group, category }) => {
      const validCategories = CATEGORIES_BY_GROUP[group] || [];
      if (!validCategories.includes(category)) {
        return { error: `${category} no pertenece al grupo ${group}. Válidas: ${validCategories.join(", ")}` };
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
    description: "Listar suscripciones y gastos recurrentes fijos",
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
    description: "Ver el patrimonio neto y su evolución",
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
    description: "Eliminar una transacción (ej: transferencia interna que no debería estar)",
    inputSchema: z.object({
      transactionId: z.string().describe("ID de la transacción a eliminar"),
      reason: z.string().describe("Razón de la eliminación"),
    }),
    execute: async ({ transactionId, reason }) => {
      const t = await prisma.personalTransaction.findUnique({ where: { id: transactionId } });
      if (!t) return { error: "Transacción no encontrada" };
      await prisma.personalTransaction.delete({ where: { id: transactionId } });
      return { success: true, deleted: { description: t.description, amount: Number(t.amount),
        date: t.date.toISOString().slice(0, 10) }, reason };
    },
  }),
};
