/**
 * Pure helpers for the dynamic taxonomy — split out from taxonomy.ts (which
 * touches Prisma) so these stay database-free and unit-testable, same
 * principle as summary.ts/budgets.ts/insights.ts.
 */

import { CUSTOM_GROUP_THEMES } from "./utils";

/** Picks the next unused color theme for a new custom group, cycling if every preset is taken. */
export function pickThemeForNewGroup(existingThemes: string[]): string {
  const free = CUSTOM_GROUP_THEMES.find((t) => !existingThemes.includes(t));
  if (free) return free;
  return CUSTOM_GROUP_THEMES[existingThemes.length % CUSTOM_GROUP_THEMES.length];
}

/**
 * Turns a human label ("Vacances", "Père (ISF)") into a stable, enum-style
 * key ("VACANCES", "PERE_ISF") matching the shape of the built-in keys
 * (SALARY, FIXED_EXPENSE, ...) — uppercase ASCII + underscores, accents
 * stripped. Appends a numeric suffix on collision so two categories can
 * never silently overwrite each other's key.
 */
export function slugifyForKey(label: string, existingKeys: string[]): string {
  const base = label
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip accents (combining diacritical marks)
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase() || "CATEGORY";

  if (!existingKeys.includes(base)) return base;
  let n = 2;
  while (existingKeys.includes(`${base}_${n}`)) n++;
  return `${base}_${n}`;
}
