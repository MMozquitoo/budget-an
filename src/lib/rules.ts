/**
 * Classification-rule engine.
 *
 * ClassificationRule had a table, an API, a seed script and a settings page —
 * but nothing ever evaluated a rule: the bank import carried its own hardcoded
 * mapping. This is the missing piece, shared by the import script, the
 * reclassify script and manual transaction creation, so a rule means the same
 * thing everywhere.
 */

import { CATEGORIES_BY_GROUP } from "@/lib/utils";

export interface RuleLike {
  id?: string;
  name?: string;
  priority?: number;
  matchField?: string;
  matchType?: string;
  matchValue: string;
  group: string;
  category: string;
  active?: boolean;
}

export interface Classification {
  group: string;
  category: string;
  ruleId?: string;
  ruleName?: string;
}

export interface MatchFields {
  description?: string | null;
  notes?: string | null;
}

/**
 * Rule patterns are user-authored and run server-side on every imported row, so
 * a pathological regex would stall the request. Guard with a length cap and a
 * nested-quantifier check — the classic catastrophic-backtracking shape — rather
 * than trusting arbitrary input.
 */
const MAX_PATTERN_LENGTH = 200;
const MAX_SUBJECT_LENGTH = 500;
const NESTED_QUANTIFIER = /(\([^)]*[+*]\)|\[[^\]]*\][+*])\s*[+*]/;

export function validateRegex(pattern: string): { ok: boolean; error?: string } {
  if (pattern.length > MAX_PATTERN_LENGTH) {
    return { ok: false, error: `Motif trop long (max ${MAX_PATTERN_LENGTH})` };
  }
  if (NESTED_QUANTIFIER.test(pattern)) {
    return { ok: false, error: "Motif trop coûteux (quantificateurs imbriqués)" };
  }
  try {
    new RegExp(pattern, "i");
    return { ok: true };
  } catch {
    return { ok: false, error: "Expression régulière invalide" };
  }
}

/** A category must belong to the group it is filed under. */
export function isCategoryInGroup(group: string, category: string): boolean {
  return (CATEGORIES_BY_GROUP[group] || []).includes(category);
}

function subjectFor(rule: RuleLike, fields: MatchFields): string {
  const field = rule.matchField ?? "description";
  const raw =
    field === "notes"
      ? fields.notes ?? ""
      : field === "all"
        ? `${fields.description ?? ""} ${fields.notes ?? ""}`
        : fields.description ?? "";
  return raw.slice(0, MAX_SUBJECT_LENGTH).toLowerCase();
}

export function matchesRule(rule: RuleLike, fields: MatchFields): boolean {
  const subject = subjectFor(rule, fields);
  if (!subject) return false;

  const value = (rule.matchValue ?? "").toLowerCase();
  if (!value) return false;

  switch (rule.matchType ?? "CONTAINS") {
    case "EXACT":
      return subject === value;
    case "STARTS_WITH":
      return subject.startsWith(value);
    case "ENDS_WITH":
      return subject.endsWith(value);
    case "REGEX": {
      if (!validateRegex(rule.matchValue).ok) return false;
      try {
        return new RegExp(rule.matchValue, "i").test(subject);
      } catch {
        return false;
      }
    }
    case "CONTAINS":
    default:
      return subject.includes(value);
  }
}

/**
 * Highest priority wins; ties break on declaration order, so the caller's
 * ordering (the API returns priority desc) stays meaningful. Returns null when
 * nothing matches — callers decide whether that's a fallback or an error.
 */
export function classify(
  rules: RuleLike[],
  fields: MatchFields
): Classification | null {
  const candidates = rules
    .filter((r) => r.active !== false)
    .filter((r) => isCategoryInGroup(r.group, r.category))
    .map((rule, index) => ({ rule, index }))
    .sort(
      (a, b) =>
        (b.rule.priority ?? 0) - (a.rule.priority ?? 0) || a.index - b.index
    );

  for (const { rule } of candidates) {
    if (matchesRule(rule, fields)) {
      return {
        group: rule.group,
        category: rule.category,
        ruleId: rule.id,
        ruleName: rule.name,
      };
    }
  }
  return null;
}
