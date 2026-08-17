/**
 * Shared test fixture mirroring the seeded built-in taxonomy (see the
 * dynamic_taxonomy migration) — the 8 groups / ~46 categories every install
 * starts with. Every pure function that now takes the taxonomy as an
 * explicit parameter (instead of importing a static constant) uses this in
 * its tests, so test files don't each hand-roll a copy that can drift from
 * what's actually seeded.
 */

export const DEFAULT_GROUP_BEHAVIOR: Record<string, string> = {
  INCOME: "income",
  FIXED_EXPENSE: "expense",
  VARIABLE_EXPENSE: "expense",
  SAVINGS: "savings",
  DEBT: "debt",
  UNEXPECTED: "expense",
  TRANSFER: "excluded",
  BUSINESS: "excluded",
};

export const DEFAULT_CATEGORIES_BY_GROUP: Record<string, string[]> = {
  INCOME: ["SALARY", "FREELANCE", "SALES", "BONUS", "AID", "OTHER_INCOME"],
  FIXED_EXPENSE: [
    "RENT", "UTILITIES", "INTERNET_PHONE", "TRANSPORT_FIXED", "SUBSCRIPTIONS",
    "INSURANCE", "CREDIT_PAYMENT", "EDUCATION_FIXED",
    "FAMILY_SUPPORT_CLAUDIA", "FAMILY_SUPPORT_FATHER",
  ],
  VARIABLE_EXPENSE: [
    "GROCERIES", "RESTAURANTS", "TRANSPORT_VARIABLE", "CLOTHING", "PHARMACY",
    "PETS", "PERSONAL_CARE", "ENTERTAINMENT", "GIFTS", "REPAIRS", "VACATION",
  ],
  SAVINGS: ["GENERAL_SAVINGS", "EMERGENCY_FUND", "TRAVEL_FUND", "EDUCATION_FUND", "BIG_PURCHASE", "INVESTMENT"],
  DEBT: ["CREDIT_CARD", "PERSONAL_LOAN", "INSTALLMENT", "INTEREST", "PENDING_PAYMENT"],
  UNEXPECTED: ["EMERGENCY", "HEALTH", "UNEXPECTED_REPAIR", "FINE", "UNPLANNED"],
  TRANSFER: ["INTERNAL_TRANSFER"],
  BUSINESS: ["BUSINESS_INCOME", "BUSINESS_EXPENSE"],
};

export const DEFAULT_CATEGORY_GROUP: Record<string, string> = Object.fromEntries(
  Object.entries(DEFAULT_CATEGORIES_BY_GROUP).flatMap(([group, cats]) =>
    cats.map((c) => [c, group])
  )
);

export const DEFAULT_GROUP_ORDER = [
  "INCOME", "FIXED_EXPENSE", "VARIABLE_EXPENSE", "SAVINGS", "DEBT", "UNEXPECTED", "TRANSFER", "BUSINESS",
];
