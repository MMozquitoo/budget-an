/**
 * Weekly alert email — the "alerting" rung of the ladder (reporting → analyse
 * → recommandation → alerting). Pure, database-free, unit-testable: turns
 * `computeInsights()`'s output (src/lib/insights-data.ts) into a subject +
 * inline-styled HTML body. Mirrors the copy/thresholds already shown on
 * `/insights` (src/app/insights/page.tsx) so the email never says something
 * different from what Adrien sees in the app.
 */

import { formatCurrency, getMonthName } from "./utils";
import type { Recommendation, Severity } from "./recommend";
import type { CategoryMovement, SavingsTrend } from "./insights";

export interface AlertInsights {
  month: number;
  year: number;
  savings: SavingsTrend | null;
  movements: (CategoryMovement & { label: string })[];
  recommendations: Recommendation[];
  totalOpportunity: number;
}

const SEVERITY_LABEL: Record<Severity, string> = {
  high: "Priorité",
  medium: "À voir",
  low: "Optionnel",
};

const SEVERITY_COLOR: Record<Severity, string> = {
  high: "#dc2626",
  medium: "#d97706",
  low: "#6b7280",
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function opportunityBlock(insights: AlertInsights): string {
  if (insights.totalOpportunity <= 0) return "";
  return `
    <div style="margin:0 0 20px;padding:16px;border-radius:8px;background:#ecfdf5;border:1px solid #a7f3d0;">
      <p style="margin:0 0 4px;font-weight:600;color:#065f46;">Marge identifiée ce mois-ci</p>
      <p style="margin:0;color:#065f46;">jusqu'à ${formatCurrency(insights.totalOpportunity)} / mois</p>
    </div>`;
}

function savingsBlock(savings: SavingsTrend | null): string {
  if (!savings) return "";
  const arrow = savings.direction === "up" ? "▲" : savings.direction === "down" ? "▼" : "";
  const color = savings.direction === "up" ? "#059669" : savings.direction === "down" ? "#dc2626" : "#6b7280";
  const deltaSign = savings.deltaPts >= 0 ? "+" : "";
  return `
    <div style="margin:0 0 20px;">
      <p style="margin:0 0 6px;font-weight:600;color:#111827;">Taux d'épargne</p>
      <p style="margin:0;font-size:24px;font-weight:700;color:#111827;">
        ${savings.current.toFixed(0)}%
        <span style="font-size:14px;font-weight:600;color:${color};">${arrow} ${deltaSign}${savings.deltaPts.toFixed(0)} pts</span>
      </p>
      <p style="margin:4px 0 0;font-size:13px;color:#6b7280;">
        Mois précédent : ${savings.previous.toFixed(0)}% · moyenne : ${savings.average.toFixed(0)}%
      </p>
    </div>`;
}

function movementsBlock(movements: AlertInsights["movements"]): string {
  const top = movements.slice(0, 6);
  const header = `<p style="margin:0 0 8px;font-weight:600;color:#111827;">Ce qui a le plus bougé</p>`;
  if (top.length === 0) {
    return `${header}<p style="margin:0;color:#6b7280;">Rien de notable vs les mois précédents.</p>`;
  }
  const rows = top
    .map((m) => {
      const color = m.direction === "up" ? "#dc2626" : "#059669";
      const sign = m.deltaPct >= 0 ? "+" : "";
      return `
        <tr>
          <td style="padding:6px 0;color:#111827;">${escapeHtml(m.label)}</td>
          <td style="padding:6px 0;color:#6b7280;">${formatCurrency(m.current)} vs ${formatCurrency(m.average)}</td>
          <td style="padding:6px 0;text-align:right;color:${color};font-weight:600;">${sign}${Math.round(m.deltaPct)}%</td>
        </tr>`;
    })
    .join("");
  return `${header}<table style="width:100%;border-collapse:collapse;font-size:14px;">${rows}</table>`;
}

function recommendationsBlock(recs: Recommendation[]): string {
  const header = `<p style="margin:20px 0 8px;font-weight:600;color:#111827;">Recommandations</p>`;
  if (recs.length === 0) {
    return `${header}<p style="margin:0;color:#6b7280;">Rien à signaler ce mois-ci. Tes budgets tiennent et aucune dépense atypique détectée.</p>`;
  }
  const items = recs
    .map((r) => {
      const badge = r.estimatedMonthly
        ? `<span style="color:#6b7280;font-size:13px;"> · ~${formatCurrency(r.estimatedMonthly)}/mois</span>`
        : "";
      return `
        <div style="margin:0 0 12px;padding:12px;border-left:3px solid ${SEVERITY_COLOR[r.severity]};background:#f9fafb;">
          <p style="margin:0 0 2px;">
            <strong style="color:#111827;">${escapeHtml(r.title)}</strong>
            <span style="font-size:12px;font-weight:600;color:${SEVERITY_COLOR[r.severity]};"> · ${SEVERITY_LABEL[r.severity]}</span>
            ${badge}
          </p>
          <p style="margin:0;color:#4b5563;font-size:14px;">${escapeHtml(r.detail)}</p>
        </div>`;
    })
    .join("");
  return `${header}${items}`;
}

/** Builds the weekly digest email from computeInsights()'s output. Pure — no I/O. */
export function buildAlertEmail(insights: AlertInsights): { subject: string; html: string } {
  const monthLabel = `${getMonthName(insights.month)} ${insights.year}`;
  const subject = `Budget AN — résumé de ${monthLabel}`;

  const html = `
    <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111827;">
      <h1 style="font-size:18px;margin:0 0 4px;">Résumé financier — ${monthLabel}</h1>
      <p style="margin:0 0 20px;color:#6b7280;font-size:13px;">Résumé hebdomadaire automatique</p>
      ${opportunityBlock(insights)}
      ${savingsBlock(insights.savings)}
      ${movementsBlock(insights.movements)}
      ${recommendationsBlock(insights.recommendations)}
      <p style="margin:24px 0 0;font-size:13px;">
        <a href="https://an.mallama.co/insights" style="color:#4f46e5;">Voir le détail sur Budget AN →</a>
      </p>
    </div>`;

  return { subject, html };
}
