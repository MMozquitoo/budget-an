import { describe, it, expect } from "vitest";
import { buildAlertEmail, type AlertInsights } from "./alerts-email";
import { formatCurrency } from "./utils";

const base: AlertInsights = {
  month: 7,
  year: 2026,
  savings: null,
  movements: [],
  recommendations: [],
  totalOpportunity: 0,
};

describe("buildAlertEmail", () => {
  it("puts the month/year in the subject", () => {
    const { subject } = buildAlertEmail(base);
    expect(subject).toContain("juillet 2026");
  });

  it("shows the empty-state copy when there is nothing to report", () => {
    const { html } = buildAlertEmail(base);
    expect(html).toContain("Rien à signaler ce mois-ci");
    expect(html).toContain("Rien de notable vs les mois précédents");
    expect(html).not.toContain("Marge identifiée");
  });

  it("shows the opportunity banner only when totalOpportunity > 0", () => {
    const { html } = buildAlertEmail({ ...base, totalOpportunity: 120 });
    expect(html).toContain("Marge identifiée ce mois-ci");
    expect(html).toContain(formatCurrency(120));
  });

  it("renders the savings trend block with direction", () => {
    const { html } = buildAlertEmail({
      ...base,
      savings: { current: 10, previous: 30, average: 25, deltaPts: -20, direction: "down" },
    });
    expect(html).toContain("10%");
    expect(html).toContain("-20 pts");
  });

  it("omits the savings block when there is no trend yet", () => {
    const { html } = buildAlertEmail(base);
    expect(html).not.toContain("Taux d'épargne");
  });

  it("renders movements, capped at 6", () => {
    const movements = Array.from({ length: 8 }, (_, i) => ({
      category: `CAT${i}`,
      group: "VARIABLE_EXPENSE",
      current: 100 + i,
      average: 50,
      delta: 50 + i,
      deltaPct: 100,
      direction: "up" as const,
      label: `Cat ${i}`,
    }));
    const { html } = buildAlertEmail({ ...base, movements });
    expect(html).toContain("Cat 0");
    expect(html).toContain("Cat 5");
    expect(html).not.toContain("Cat 6");
  });

  it("renders recommendations with severity and escapes HTML in free text", () => {
    const { html } = buildAlertEmail({
      ...base,
      recommendations: [
        {
          type: "over_budget",
          severity: "high",
          category: "GROCERIES",
          title: "Courses <script> : budget dépassé",
          detail: "120 € dépensés pour un budget de 90 €.",
          estimatedMonthly: 30,
        },
      ],
    });
    expect(html).toContain("Priorité");
    expect(html).toContain(`~${formatCurrency(30)}/mois`);
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });
});
