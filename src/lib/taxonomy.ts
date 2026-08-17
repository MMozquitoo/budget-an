/**
 * Orchestration for the dynamic taxonomy (groups/categories) — was a fixed
 * Postgres enum + hardcoded constants in utils.ts, now two DB tables
 * (CategoryGroup, Category) so Adrien can create his own via chat without a
 * deploy. Same split as computeInsights()/insights.ts: this file touches
 * Prisma and shapes the result into exactly what the old static constants
 * used to export, so every pure `lib/*.ts` function and every page/route
 * that used to `import { GROUP_LABELS, ... } from "./utils"` now takes this
 * shape as an explicit parameter instead.
 */

import { prisma } from "@/lib/prisma";
import { COLOR_THEMES } from "@/lib/utils";

export { pickThemeForNewGroup, slugifyForKey } from "./taxonomy-helpers";

export type GroupBehavior = "income" | "expense" | "savings" | "debt" | "excluded";

export interface Taxonomy {
  groupOrder: string[];
  groupLabels: Record<string, string>;
  groupColors: Record<string, { bg: string; text: string; dot: string; border: string }>;
  /** Drives aggregate()'s totals — replaces the old per-file `!== "TRANSFER" && !== "BUSINESS"` checks. */
  groupBehavior: Record<string, GroupBehavior>;
  categoryLabels: Record<string, string>;
  categoriesByGroup: Record<string, string[]>;
  /** category key -> group key (was budgets.ts's module-scope CATEGORY_GROUP, derived from a static import). */
  categoryGroup: Record<string, string>;
}

/** Fetched fresh per request — a handful of rows, same cost class as the ClassificationRule lookups already done per-request elsewhere. No cache needed at this scale. */
export async function getTaxonomy(): Promise<Taxonomy> {
  const groups = await prisma.categoryGroup.findMany({
    orderBy: { order: "asc" },
    include: { categories: { orderBy: { order: "asc" } } },
  });

  const groupOrder: string[] = [];
  const groupLabels: Record<string, string> = {};
  const groupColors: Taxonomy["groupColors"] = {};
  const groupBehavior: Record<string, GroupBehavior> = {};
  const categoryLabels: Record<string, string> = {};
  const categoriesByGroup: Record<string, string[]> = {};
  const categoryGroup: Record<string, string> = {};

  for (const g of groups) {
    groupOrder.push(g.key);
    groupLabels[g.key] = g.label;
    groupColors[g.key] = COLOR_THEMES[g.colorTheme] ?? COLOR_THEMES.slate;
    groupBehavior[g.key] = g.behavior as GroupBehavior;
    categoriesByGroup[g.key] = g.categories.map((c) => c.key);
    for (const c of g.categories) {
      categoryLabels[c.key] = c.label;
      categoryGroup[c.key] = g.key;
    }
  }

  return { groupOrder, groupLabels, groupColors, groupBehavior, categoryLabels, categoriesByGroup, categoryGroup };
}
