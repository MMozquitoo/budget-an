/**
 * Recommendation engine — the "recommandation" rung. Pure and unit-testable: it
 * takes the analysis (movements, savings trend), the current-month budget report,
 * and the detected subscriptions, and turns them into a ranked list of concrete
 * actions. Human strings are built from an injected label map so the logic stays
 * database- and locale-agnostic in tests.
 */

import type { BudgetReport } from "./budgets";
import type { CategoryMovement, SavingsTrend } from "./insights";

export type RecommendationType =
  | "over_budget"
  | "unused_budget"
  | "dead_subscription"
  | "price_hike"
  | "anomaly"
  | "savings_drop";

export type Severity = "high" | "medium" | "low";

export interface Recommendation {
  type: RecommendationType;
  severity: Severity;
  category?: string;
  title: string;
  detail: string;
  /** Euros per month this action could save or free up, when quantifiable. */
  estimatedMonthly?: number;
}

export interface SubscriptionLite {
  description: string;
  active: boolean;
  monthlyEquivalent: number;
  lastDate?: string | null;
  priceChange?: { from: number; to: number; pct: number } | null;
}

export interface RecommendInput {
  budgetReport?: BudgetReport | null;
  movements?: CategoryMovement[];
  subscriptions?: SubscriptionLite[];
  savings?: SavingsTrend | null;
  labels?: Record<string, string>;
}

const SEVERITY_RANK: Record<Severity, number> = { high: 0, medium: 1, low: 2 };
const eur = (n: number) => `${Math.round(n)} €`;

export function recommend(input: RecommendInput): Recommendation[] {
  const labels = input.labels ?? {};
  const label = (c: string) => labels[c] ?? c;
  const recs: Recommendation[] = [];

  // 1. Over-budget categories (cap direction, exceeded).
  for (const line of input.budgetReport?.lines ?? []) {
    if (line.direction !== "cap" || line.health !== "over") continue;
    const over = line.actual - line.budget;
    recs.push({
      type: "over_budget",
      severity: over >= line.budget * 0.25 ? "high" : "medium",
      category: line.category,
      title: `${label(line.category)} : budget dépassé`,
      detail: `${eur(line.actual)} dépensés pour un budget de ${eur(line.budget)} (+${eur(over)}). Relève le plafond ou réduis la dépense.`,
      estimatedMonthly: over,
    });
  }

  // 2. Budgets barely used (a cap under 40% used → over-provisioned, reallocate).
  for (const line of input.budgetReport?.lines ?? []) {
    if (line.direction !== "cap" || line.budget <= 0) continue;
    if (line.pct >= 40) continue;
    const slack = line.budget - line.actual;
    if (slack < 30) continue;
    recs.push({
      type: "unused_budget",
      severity: "low",
      category: line.category,
      title: `${label(line.category)} : budget peu utilisé`,
      detail: `Seulement ${Math.round(line.pct)}% utilisé (${eur(line.actual)} / ${eur(line.budget)}). Tu peux réallouer ~${eur(slack)} vers l'épargne.`,
      estimatedMonthly: slack,
    });
  }

  // 3. Dead subscriptions — still charged but inactive. Skip anything with no
  // quantifiable monthly cost (e.g. a single one-off transfer hand-flagged
  // recurring) — "résilie ça, ça te coûte ~0 €/mois" isn't a real recommendation.
  for (const sub of input.subscriptions ?? []) {
    if (sub.active || sub.monthlyEquivalent <= 0) continue;
    recs.push({
      type: "dead_subscription",
      severity: sub.monthlyEquivalent >= 10 ? "high" : "medium",
      title: `Abonnement inactif : ${sub.description}`,
      detail: `Plus de mouvement récent${sub.lastDate ? ` (dernier le ${sub.lastDate})` : ""}, mais ~${eur(sub.monthlyEquivalent)}/mois. À résilier si tu ne l'utilises plus.`,
      estimatedMonthly: sub.monthlyEquivalent,
    });
  }

  // 4. Price hikes on active subscriptions.
  for (const sub of input.subscriptions ?? []) {
    if (!sub.active || !sub.priceChange || sub.priceChange.pct <= 0) continue;
    const { from, to, pct } = sub.priceChange;
    recs.push({
      type: "price_hike",
      severity: pct >= 20 ? "medium" : "low",
      title: `Hausse de prix : ${sub.description}`,
      detail: `Passé de ${eur(from)} à ${eur(to)} (+${Math.round(pct)}%). Vérifie si l'offre en vaut encore la peine.`,
      estimatedMonthly: Math.max(0, to - from),
    });
  }

  // 5. Spending anomalies — a category well above its own trailing average.
  for (const m of input.movements ?? []) {
    if (m.direction !== "up" || m.deltaPct < 50 || m.delta < 50) continue;
    // Skip if it's already covered by an over-budget rec for the same category.
    if (recs.some((r) => r.type === "over_budget" && r.category === m.category)) continue;
    recs.push({
      type: "anomaly",
      severity: m.deltaPct >= 100 ? "medium" : "low",
      category: m.category,
      title: `${label(m.category)} : dépense atypique`,
      detail: `${eur(m.current)} ce mois-ci contre ~${eur(m.average)} en moyenne (+${Math.round(m.deltaPct)}%). À vérifier.`,
      estimatedMonthly: m.delta,
    });
  }

  // 6. Savings rate dropping.
  if (input.savings && input.savings.direction === "down" && input.savings.deltaPts <= -3) {
    recs.push({
      type: "savings_drop",
      severity: input.savings.deltaPts <= -8 ? "high" : "medium",
      title: "Taux d'épargne en baisse",
      detail: `${input.savings.current.toFixed(0)}% ce mois-ci contre ${input.savings.previous.toFixed(0)}% le mois dernier (${input.savings.deltaPts.toFixed(0)} pts). Regarde les postes qui ont le plus augmenté.`,
    });
  }

  recs.sort((a, b) => {
    const s = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
    if (s !== 0) return s;
    return (b.estimatedMonthly ?? 0) - (a.estimatedMonthly ?? 0);
  });
  return recs;
}

/** Total quantifiable monthly upside across recommendations. */
export function totalOpportunity(recs: Recommendation[]): number {
  return recs
    .filter((r) => r.type === "dead_subscription" || r.type === "unused_budget" || r.type === "over_budget")
    .reduce((s, r) => s + (r.estimatedMonthly ?? 0), 0);
}
