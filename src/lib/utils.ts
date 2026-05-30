export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatCurrencyDecimal(amount: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ");
}

export function getMonthName(month: number): string {
  return new Date(2024, month - 1).toLocaleString("en", { month: "long" });
}

export function getCurrentMonth(): number {
  return new Date().getMonth() + 1;
}

export function getCurrentYear(): number {
  return new Date().getFullYear();
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function formatHours(hours: number): string {
  return `${hours.toFixed(1)}h`;
}

export const HOUSEHOLD_LABELS: Record<string, string> = {
  FIXED: "Fixed Costs",
  VARIABLE: "Variable",
  FAMILY_TRAVEL: "Family Travel",
  NICOLAS: "Nicolas",
};

export const DECISION_CATEGORY_LABELS: Record<string, string> = {
  HIRE: "Hire",
  EVENT: "Event",
  TRAVEL: "Travel",
  TOOL: "Tool",
  PROJECT: "Project",
  PARTNERSHIP: "Partnership",
  INVESTMENT: "Investment",
};

export const DECISION_STATUS_LABELS: Record<string, string> = {
  PLANNED: "Planned",
  APPROVED: "Approved",
  DONE: "Done",
  ABANDONED: "Abandoned",
};

export const DECISION_CATEGORY_COLORS: Record<string, string> = {
  HIRE: "#3b82f6",
  EVENT: "#f59e0b",
  TRAVEL: "#14b8a6",
  TOOL: "#6b7280",
  PROJECT: "#6366f1",
  PARTNERSHIP: "#8b5cf6",
  INVESTMENT: "#22c55e",
};

export const TIME_ENTRY_TYPE_LABELS: Record<string, string> = {
  SALES: "Sales",
  DELIVERY: "Delivery",
  CONTENT: "Content",
  ADMIN: "Admin",
  EVENT_PREP: "Event Prep",
  NETWORKING: "Networking",
  STRATEGY: "Strategy",
};

export const PIPELINE_STATUS_COLORS: Record<string, string> = {
  OPEN: "#3b82f6",
  WON: "#22c55e",
  LOST: "#ef4444",
};

export const BUSINESS_LINE_COLORS: Record<string, string> = {
  "GTM Advisory": "#6366f1",
  Events: "#f59e0b",
  Media: "#ec4899",
  Community: "#14b8a6",
  Speaking: "#8b5cf6",
  Partnerships: "#f97316",
};
