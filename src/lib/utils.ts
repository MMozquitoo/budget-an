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

// ── Personal Transaction System ──

export const GROUP_LABELS: Record<string, string> = {
  INCOME: "Ingresos",
  FIXED_EXPENSE: "Gastos Fijos",
  VARIABLE_EXPENSE: "Gastos Variables",
  SAVINGS: "Ahorro",
  DEBT: "Deudas",
  UNEXPECTED: "Imprevistos",
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
  // Ingresos
  SALARY: "Salario",
  FREELANCE: "Freelance",
  SALES: "Ventas",
  BONUS: "Bonos / Comisiones",
  AID: "Ayudas / Préstamos",
  OTHER_INCOME: "Otros ingresos",
  // Gastos fijos
  RENT: "Arriendo / Hipoteca",
  UTILITIES: "Servicios (agua, luz, gas)",
  INTERNET_PHONE: "Internet / Celular",
  TRANSPORT_FIXED: "Transporte fijo",
  SUBSCRIPTIONS: "Suscripciones",
  INSURANCE: "Seguros",
  CREDIT_PAYMENT: "Créditos / Cuotas fijas",
  EDUCATION_FIXED: "Matrícula / Estudios",
  // Gastos variables
  GROCERIES: "Mercado / Comida",
  RESTAURANTS: "Restaurantes / Domicilios",
  TRANSPORT_VARIABLE: "Transporte ocasional",
  CLOTHING: "Ropa",
  PHARMACY: "Farmacia",
  PETS: "Mascotas",
  PERSONAL_CARE: "Belleza / Cuidado personal",
  ENTERTAINMENT: "Salidas / Ocio",
  GIFTS: "Regalos",
  REPAIRS: "Reparaciones",
  // Ahorro
  GENERAL_SAVINGS: "Ahorro general",
  EMERGENCY_FUND: "Fondo de emergencia",
  TRAVEL_FUND: "Viajes",
  EDUCATION_FUND: "Estudios",
  BIG_PURCHASE: "Compra grande",
  INVESTMENT: "Inversión",
  // Deudas
  CREDIT_CARD: "Tarjeta de crédito",
  PERSONAL_LOAN: "Préstamos personales",
  INSTALLMENT: "Cuotas",
  INTEREST: "Intereses",
  PENDING_PAYMENT: "Pagos pendientes",
  // Imprevistos
  EMERGENCY: "Emergencias",
  HEALTH: "Salud",
  UNEXPECTED_REPAIR: "Reparaciones urgentes",
  FINE: "Multas",
  UNPLANNED: "Gastos no planeados",
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
