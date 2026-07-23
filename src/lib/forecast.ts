/**
 * Cash-flow forecast. Projects the account balance forward from a starting
 * balance using the average monthly cash change (income − expenses − savings)
 * over the recent history. Pure and unit-testable; the API supplies the data and
 * the starting balance (derived from the latest net-worth cash snapshot).
 */

import { shiftMonth } from "./utils";

export interface FlowMonth {
  income: number;
  expenses: number; // everything non-income except savings, i.e. real outflow to spend
  savings: number;
}

/** Mean monthly cash change over the series (income − expenses − savings). */
export function averageNetFlow(series: FlowMonth[]): number {
  if (series.length === 0) return 0;
  const sum = series.reduce((s, p) => s + (p.income - p.expenses - p.savings), 0);
  return sum / series.length;
}

export interface ForecastPoint {
  key: string; // "YYYY-MM"
  projected: number; // projected end-of-month balance
}

/** Balance projected `horizon` months past the anchor at a steady net flow. */
export function forecast(
  startingBalance: number,
  avgNetFlow: number,
  horizon: number,
  anchorYear: number,
  anchorMonth: number
): ForecastPoint[] {
  const out: ForecastPoint[] = [];
  for (let i = 1; i <= horizon; i++) {
    const { year, month } = shiftMonth(anchorYear, anchorMonth, i);
    out.push({
      key: `${year}-${String(month).padStart(2, "0")}`,
      projected: startingBalance + avgNetFlow * i,
    });
  }
  return out;
}

/** First month the projected balance goes negative, or null if it stays positive. */
export function firstShortfall(points: ForecastPoint[]): ForecastPoint | null {
  return points.find((p) => p.projected < 0) ?? null;
}
