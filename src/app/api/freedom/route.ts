import { prisma } from "@/lib/prisma";
import { monthRange, monthRangeBack } from "@/lib/utils";
import { NextRequest } from "next/server";

// FIX 2: Configurable tax reserve placeholder.
// This is NOT a tax calculation — it's a holdback estimate.
// The real rate depends on Butterfly's legal structure (SARL, SAS, micro, etc.)
// and must be validated by an expert-comptable.
const TAX_RESERVE_RATE = 0.35;

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const month = Number(searchParams.get("month"));
  const year = Number(searchParams.get("year"));

  if (!month || !year) {
    return Response.json(
      { error: "month and year query params required" },
      { status: 400 }
    );
  }

  const dateFilter = monthRange(year, month);

  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;

  // FIX 3: Rolling average — the `rollingMonths` whole months before the current one
  const rollingMonths = 3;
  const rollingWindow = monthRangeBack(year, month, rollingMonths);

  const [
    householdExpenses,
    revenues,
    businessExpenses,
    personalIncomes,
    timeEntries,
    wealthSnapshot,
    previousSnapshot,
    openPipeline,
    rollingHousehold,
    rollingBizExpenses,
  ] = await Promise.all([
    prisma.householdExpense.findMany({ where: { date: dateFilter } }),
    prisma.revenue.findMany({
      where: { date: dateFilter },
      include: { businessLine: true },
    }),
    prisma.businessExpense.findMany({ where: { date: dateFilter } }),
    prisma.personalIncome.findMany({ where: { date: dateFilter } }),
    prisma.timeEntry.findMany({
      where: { date: dateFilter },
      include: { businessLine: true },
    }),
    prisma.wealthSnapshot.findFirst({ where: { month, year } }),
    prisma.wealthSnapshot.findFirst({
      where: { month: prevMonth, year: prevYear },
    }),
    prisma.pipelineOpportunity.findMany({ where: { status: "OPEN" } }),
    prisma.householdExpense.findMany({
      where: { date: rollingWindow },
    }),
    prisma.businessExpense.findMany({
      where: {
        date: rollingWindow,
        isOwnerDraw: false,
      },
    }),
  ]);

  // Current month totals
  const personalIncome = personalIncomes.reduce(
    (sum, e) => sum + Number(e.amount),
    0
  );

  const personalBurn = householdExpenses.reduce(
    (sum, e) => sum + Number(e.amount),
    0
  );

  const businessRevenue = revenues.reduce(
    (sum, r) => sum + Number(r.amount),
    0
  );

  // FIX 4: Separate real business expenses from owner draws
  const ownerDraws = businessExpenses
    .filter((e) => e.isOwnerDraw)
    .reduce((sum, e) => sum + Number(e.amount), 0);
  const businessExpensesReal = businessExpenses
    .filter((e) => !e.isOwnerDraw)
    .reduce((sum, e) => sum + Number(e.amount), 0);
  const businessExpensesTotal = businessExpensesReal + ownerDraws;

  // FIX 2: Tax reserve
  const taxReserveRate = TAX_RESERVE_RATE;
  const taxReserveRequired = businessRevenue * taxReserveRate;
  const revenueAfterTax = businessRevenue - taxReserveRequired;

  // FIX 4: Business margin excludes owner draws
  const butterflyMargin = businessRevenue - businessExpensesReal;

  // Wealth
  const cashPersonal = wealthSnapshot ? Number(wealthSnapshot.cashPersonal) : 0;
  const cashBusiness = wealthSnapshot ? Number(wealthSnapshot.cashBusiness) : 0;
  const emergencyFund = wealthSnapshot ? Number(wealthSnapshot.emergencyFund) : 0;
  const investments = wealthSnapshot ? Number(wealthSnapshot.investments) : 0;
  const debt = wealthSnapshot ? Number(wealthSnapshot.debt) : 0;
  const butterflyValue = wealthSnapshot ? Number(wealthSnapshot.butterflyValue) : 0;

  const netWorth =
    cashPersonal + cashBusiness + emergencyFund + investments + butterflyValue - debt;

  const previousNetWorth = previousSnapshot
    ? Number(previousSnapshot.cashPersonal) +
      Number(previousSnapshot.cashBusiness) +
      Number(previousSnapshot.emergencyFund) +
      Number(previousSnapshot.investments) +
      Number(previousSnapshot.butterflyValue) -
      Number(previousSnapshot.debt)
    : null;

  // FIX 3: Rolling average burn for runway
  const rollingHouseholdTotal = rollingHousehold.reduce(
    (sum, e) => sum + Number(e.amount),
    0
  );
  const rollingBizTotal = rollingBizExpenses.reduce(
    (sum, e) => sum + Number(e.amount),
    0
  );

  // Count distinct months with data in the rolling window
  const householdMonthSet = new Set(
    rollingHousehold.map((e) => `${e.date.getMonth()}-${e.date.getFullYear()}`)
  );
  const bizMonthSet = new Set(
    rollingBizExpenses.map((e) => `${e.date.getMonth()}-${e.date.getFullYear()}`)
  );

  const householdMonthCount = Math.max(householdMonthSet.size, 1);
  const bizMonthCount = Math.max(bizMonthSet.size, 1);

  const avgPersonalBurn = rollingHouseholdTotal / householdMonthCount;
  const avgBusinessBurn = rollingBizTotal / bizMonthCount;

  const runwayPersonalMonths =
    avgPersonalBurn > 0 ? cashPersonal / avgPersonalBurn : null;
  const runwayBusinessMonths =
    avgBusinessBurn > 0 ? cashBusiness / avgBusinessBurn : null;

  // Client concentration
  const revenueByClient: Record<string, number> = {};
  for (const r of revenues) {
    const client = r.client || "Unknown";
    revenueByClient[client] = (revenueByClient[client] || 0) + Number(r.amount);
  }

  let topClientName = "";
  let topClientRevenue = 0;
  for (const [client, rev] of Object.entries(revenueByClient)) {
    if (rev > topClientRevenue) {
      topClientRevenue = rev;
      topClientName = client;
    }
  }

  const topClientPct =
    businessRevenue > 0 ? (topClientRevenue / businessRevenue) * 100 : 0;

  // Pipeline
  const pipelineTotal = openPipeline.reduce(
    (sum, o) => sum + Number(o.value),
    0
  );
  const pipelineWeighted = openPipeline.reduce(
    (sum, o) => sum + (Number(o.value) * o.probability) / 100,
    0
  );

  // Revenue by business line
  const lineMap: Record<
    string,
    { name: string; revenue: number; hours: number; color: string }
  > = {};

  for (const r of revenues) {
    const lineId = r.businessLineId;
    if (!lineMap[lineId]) {
      lineMap[lineId] = {
        name: r.businessLine.name,
        revenue: 0,
        hours: 0,
        color: r.businessLine.color,
      };
    }
    lineMap[lineId].revenue += Number(r.amount);
  }

  for (const t of timeEntries) {
    const lineId = t.businessLineId;
    if (!lineMap[lineId]) {
      lineMap[lineId] = {
        name: t.businessLine.name,
        revenue: 0,
        hours: 0,
        color: t.businessLine.color,
      };
    }
    lineMap[lineId].hours += Number(t.hours);
  }

  const revenueByLine = Object.values(lineMap).map((line) => ({
    name: line.name,
    revenue: line.revenue,
    hours: line.hours,
    euroPerHour: line.hours > 0 ? line.revenue / line.hours : 0,
    color: line.color,
  }));

  const totalHours = timeEntries.reduce(
    (sum, t) => sum + Number(t.hours),
    0
  );

  const hasRealBalances =
    wealthSnapshot !== null &&
    (cashPersonal > 0 || cashBusiness > 0 || emergencyFund > 0 ||
      investments > 0 || debt > 0 || butterflyValue > 0);

  return Response.json({
    personalIncome,
    personalBurn,
    businessRevenue,
    businessExpenses: businessExpensesTotal,
    businessExpensesReal,
    ownerDraws,
    butterflyMargin,
    taxReserveRate,
    taxReserveRequired,
    revenueAfterTax,
    businessCash: cashBusiness,
    personalCash: cashPersonal,
    netWorth,
    previousNetWorth,
    runwayPersonalMonths,
    runwayBusinessMonths,
    avgPersonalBurn,
    avgBusinessBurn,
    rollingMonths: Math.min(householdMonthCount, rollingMonths),
    topClientPct,
    topClientName,
    pipelineTotal,
    pipelineWeighted,
    revenueByLine,
    totalHours,
    hasRealBalances,
    wealthSnapshot: wealthSnapshot
      ? {
          ...wealthSnapshot,
          cashPersonal,
          cashBusiness,
          emergencyFund,
          investments,
          debt,
          butterflyValue,
        }
      : null,
  });
}
