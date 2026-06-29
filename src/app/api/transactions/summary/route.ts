import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const month = Number(sp.get("month") || new Date().getMonth() + 1);
  const year = Number(sp.get("year") || new Date().getFullYear());

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  const transactions = await prisma.personalTransaction.findMany({
    where: { date: { gte: startDate, lte: endDate } },
  });

  const byGroup: Record<string, number> = {};
  const byCategory: Record<string, number> = {};

  for (const t of transactions) {
    const amt = Number(t.amount);
    byGroup[t.group] = (byGroup[t.group] || 0) + amt;
    byCategory[t.category] = (byCategory[t.category] || 0) + amt;
  }

  const totalIncome = byGroup["INCOME"] || 0;
  const totalFixedExpense = byGroup["FIXED_EXPENSE"] || 0;
  const totalVariableExpense = byGroup["VARIABLE_EXPENSE"] || 0;
  const totalSavings = byGroup["SAVINGS"] || 0;
  const totalDebt = byGroup["DEBT"] || 0;
  const totalUnexpected = byGroup["UNEXPECTED"] || 0;

  const totalExpenses = totalFixedExpense + totalVariableExpense + totalUnexpected;
  const totalOutflow = totalExpenses + totalSavings + totalDebt;
  const balance = totalIncome - totalOutflow;
  const savingsRate = totalIncome > 0 ? (totalSavings / totalIncome) * 100 : 0;
  const expenseRate = totalIncome > 0 ? (totalExpenses / totalIncome) * 100 : 0;

  // Previous month for comparison
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const prevStart = new Date(prevYear, prevMonth - 1, 1);
  const prevEnd = new Date(prevYear, prevMonth, 0, 23, 59, 59);

  const prevTransactions = await prisma.personalTransaction.findMany({
    where: { date: { gte: prevStart, lte: prevEnd } },
  });

  let prevIncome = 0;
  let prevExpenses = 0;
  for (const t of prevTransactions) {
    const amt = Number(t.amount);
    if (t.group === "INCOME") prevIncome += amt;
    if (["FIXED_EXPENSE", "VARIABLE_EXPENSE", "UNEXPECTED"].includes(t.group)) prevExpenses += amt;
  }

  return Response.json({
    month,
    year,
    totalIncome,
    totalFixedExpense,
    totalVariableExpense,
    totalSavings,
    totalDebt,
    totalUnexpected,
    totalExpenses,
    totalOutflow,
    balance,
    savingsRate,
    expenseRate,
    prevIncome,
    prevExpenses,
    byGroup,
    byCategory,
    transactionCount: transactions.length,
  });
}
