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
  return new Date(2024, month - 1).toLocaleString("fr-FR", { month: "long" });
}

export function getCurrentMonth(): number {
  return new Date().getMonth() + 1;
}

// Legacy rows (household/business/revenue/income) were entered at local-midnight
// in Europe/Paris, so a `new Date(year, month-1, 1)` boundary evaluated in UTC on
// Vercel misbuckets any 1st-of-month row into the previous month. These helpers
// build the [start-of-month, start-of-next-month) window as UTC instants that
// correspond to Paris wall-clock midnight, so filtering is timezone-correct
// regardless of the server's timezone.
function zonedWallMidnightUtc(year: number, month: number, timeZone: string): Date {
  const guessMs = Date.UTC(year, month - 1, 1, 0, 0, 0);
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = dtf.formatToParts(new Date(guessMs));
  const map: Record<string, number> = {};
  for (const p of parts) if (p.type !== "literal") map[p.type] = Number(p.value);
  const asIfUtcMs = Date.UTC(
    map.year,
    map.month - 1,
    map.day,
    map.hour,
    map.minute,
    map.second
  );
  const offsetMs = asIfUtcMs - guessMs;
  return new Date(guessMs - offsetMs);
}

export function monthRange(
  year: number,
  month: number,
  timeZone = "Europe/Paris"
): { gte: Date; lt: Date } {
  const gte = zonedWallMidnightUtc(year, month, timeZone);
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  const lt = zonedWallMidnightUtc(nextYear, nextMonth, timeZone);
  return { gte, lt };
}

// Window covering `count` whole months ending at (and excluding) the start of
// `year`-`month`. Used for rolling-average windows.
export function monthRangeBack(
  year: number,
  month: number,
  count: number,
  timeZone = "Europe/Paris"
): { gte: Date; lt: Date } {
  const lt = zonedWallMidnightUtc(year, month, timeZone);
  const startTotal = year * 12 + (month - 1) - count;
  const startYear = Math.floor(startTotal / 12);
  const startMonth = (startTotal % 12) + 1;
  const gte = zonedWallMidnightUtc(startYear, startMonth, timeZone);
  return { gte, lt };
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

// ── Personal Transaction System ──

export const GROUP_LABELS: Record<string, string> = {
  INCOME: "Revenus",
  FIXED_EXPENSE: "Charges fixes",
  VARIABLE_EXPENSE: "Dépenses variables",
  SAVINGS: "Épargne",
  DEBT: "Dettes",
  UNEXPECTED: "Imprévus",
};

export const GROUP_COLORS: Record<string, { bg: string; text: string; dot: string; border: string }> = {
  INCOME:           { bg: "bg-emerald-50",  text: "text-emerald-700",  dot: "bg-emerald-500",  border: "border-emerald-200" },
  FIXED_EXPENSE:    { bg: "bg-blue-50",     text: "text-blue-700",     dot: "bg-blue-500",     border: "border-blue-200" },
  VARIABLE_EXPENSE: { bg: "bg-amber-50",    text: "text-amber-700",    dot: "bg-amber-500",    border: "border-amber-200" },
  SAVINGS:          { bg: "bg-violet-50",   text: "text-violet-700",   dot: "bg-violet-500",   border: "border-violet-200" },
  DEBT:             { bg: "bg-red-50",      text: "text-red-700",      dot: "bg-red-500",      border: "border-red-200" },
  UNEXPECTED:       { bg: "bg-orange-50",   text: "text-orange-700",   dot: "bg-orange-500",   border: "border-orange-200" },
};

export const CATEGORY_LABELS: Record<string, string> = {
  // Revenus
  SALARY: "Salaire",
  FREELANCE: "Freelance",
  SALES: "Ventes",
  BONUS: "Primes / Commissions",
  AID: "Aides / Prêts",
  OTHER_INCOME: "Autres revenus",
  // Charges fixes
  RENT: "Loyer / Crédit immo",
  UTILITIES: "Services (eau, élec, gaz)",
  INTERNET_PHONE: "Internet / Téléphone",
  TRANSPORT_FIXED: "Transport fixe",
  SUBSCRIPTIONS: "Abonnements",
  INSURANCE: "Assurances",
  CREDIT_PAYMENT: "Crédits / Mensualités",
  EDUCATION_FIXED: "Scolarité / Formation",
  // Dépenses variables
  GROCERIES: "Courses / Alimentation",
  RESTAURANTS: "Restaurants / Livraison",
  TRANSPORT_VARIABLE: "Transport occasionnel",
  CLOTHING: "Vêtements",
  PHARMACY: "Pharmacie",
  PETS: "Animaux",
  PERSONAL_CARE: "Soins / Beauté",
  ENTERTAINMENT: "Sorties / Loisirs",
  GIFTS: "Cadeaux",
  REPAIRS: "Réparations",
  // Épargne
  GENERAL_SAVINGS: "Épargne générale",
  EMERGENCY_FUND: "Fonds d'urgence",
  TRAVEL_FUND: "Voyages",
  EDUCATION_FUND: "Études",
  BIG_PURCHASE: "Achat important",
  INVESTMENT: "Investissement",
  // Dettes
  CREDIT_CARD: "Carte de crédit",
  PERSONAL_LOAN: "Prêts personnels",
  INSTALLMENT: "Mensualités",
  INTEREST: "Intérêts",
  PENDING_PAYMENT: "Paiements en attente",
  // Imprévus
  EMERGENCY: "Urgences",
  HEALTH: "Santé",
  UNEXPECTED_REPAIR: "Réparations urgentes",
  FINE: "Amendes",
  UNPLANNED: "Dépenses imprévues",
};

export const CATEGORIES_BY_GROUP: Record<string, string[]> = {
  INCOME: ["SALARY", "FREELANCE", "SALES", "BONUS", "AID", "OTHER_INCOME"],
  FIXED_EXPENSE: ["RENT", "UTILITIES", "INTERNET_PHONE", "TRANSPORT_FIXED", "SUBSCRIPTIONS", "INSURANCE", "CREDIT_PAYMENT", "EDUCATION_FIXED"],
  VARIABLE_EXPENSE: ["GROCERIES", "RESTAURANTS", "TRANSPORT_VARIABLE", "CLOTHING", "PHARMACY", "PETS", "PERSONAL_CARE", "ENTERTAINMENT", "GIFTS", "REPAIRS"],
  SAVINGS: ["GENERAL_SAVINGS", "EMERGENCY_FUND", "TRAVEL_FUND", "EDUCATION_FUND", "BIG_PURCHASE", "INVESTMENT"],
  DEBT: ["CREDIT_CARD", "PERSONAL_LOAN", "INSTALLMENT", "INTEREST", "PENDING_PAYMENT"],
  UNEXPECTED: ["EMERGENCY", "HEALTH", "UNEXPECTED_REPAIR", "FINE", "UNPLANNED"],
};

export const GROUP_ORDER = ["INCOME", "FIXED_EXPENSE", "VARIABLE_EXPENSE", "SAVINGS", "DEBT", "UNEXPECTED"] as const;

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
