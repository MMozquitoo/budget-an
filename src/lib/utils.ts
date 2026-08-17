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

// Which calendar month a stored instant falls into, read in `timeZone` rather
// than in the server's zone. Counterpart to monthRange(): use it whenever a row's
// date has to be bucketed back into a month (trends, "latest month" lookups).
export function monthPartsInZone(
  date: Date,
  timeZone = "Europe/Paris"
): { year: number; month: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(date);
  const map: Record<string, string> = {};
  for (const p of parts) if (p.type !== "literal") map[p.type] = p.value;
  return { year: Number(map.year), month: Number(map.month) };
}

/** Sortable `YYYY-MM` key for a stored instant, bucketed in `timeZone`. */
export function monthKeyInZone(date: Date, timeZone = "Europe/Paris"): string {
  const { year, month } = monthPartsInZone(date, timeZone);
  return `${year}-${String(month).padStart(2, "0")}`;
}

/** Step a {year, month} pair by `delta` months (month is 1-indexed). */
export function shiftMonth(
  year: number,
  month: number,
  delta: number
): { year: number; month: number } {
  const total = year * 12 + (month - 1) + delta;
  return { year: Math.floor(total / 12), month: (((total % 12) + 12) % 12) + 1 };
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

// ── Personal Transaction System ──
// The taxonomy itself (groups/categories/labels/order) is no longer a
// static export here — it's DB-backed so Adrien can create his own via
// chat. See lib/taxonomy.ts (getTaxonomy()) for groupLabels/categoryLabels/
// categoriesByGroup/groupOrder/groupColors, fetched fresh per request.
// This file keeps only the presentation constant that has to stay static:
// Tailwind needs literal class names, so a color can't be built from an
// arbitrary DB string — CategoryGroup.colorTheme is a key into this palette.

export const COLOR_THEMES: Record<string, { bg: string; text: string; dot: string; border: string }> = {
  emerald: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500", border: "border-emerald-200" },
  blue:    { bg: "bg-blue-50",    text: "text-blue-700",    dot: "bg-blue-500",    border: "border-blue-200" },
  amber:   { bg: "bg-amber-50",   text: "text-amber-700",   dot: "bg-amber-500",   border: "border-amber-200" },
  violet:  { bg: "bg-violet-50",  text: "text-violet-700",  dot: "bg-violet-500",  border: "border-violet-200" },
  red:     { bg: "bg-red-50",     text: "text-red-700",     dot: "bg-red-500",     border: "border-red-200" },
  orange:  { bg: "bg-orange-50",  text: "text-orange-700",  dot: "bg-orange-500",  border: "border-orange-200" },
  slate:   { bg: "bg-slate-50",   text: "text-slate-700",   dot: "bg-slate-500",   border: "border-slate-200" },
  indigo:  { bg: "bg-indigo-50",  text: "text-indigo-700",  dot: "bg-indigo-500",  border: "border-indigo-200" },
  teal:    { bg: "bg-teal-50",    text: "text-teal-700",    dot: "bg-teal-500",    border: "border-teal-200" },
  pink:    { bg: "bg-pink-50",    text: "text-pink-700",    dot: "bg-pink-500",    border: "border-pink-200" },
  cyan:    { bg: "bg-cyan-50",    text: "text-cyan-700",    dot: "bg-cyan-500",    border: "border-cyan-200" },
};

/** Themes not already used by a built-in group — offered round-robin to new custom groups. */
export const CUSTOM_GROUP_THEMES = ["teal", "pink", "cyan"] as const;

