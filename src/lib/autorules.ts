/**
 * Auto-rules from your corrections. Every hand-made classification is flagged
 * `manuallyClassified` — a free labelled dataset. This miner groups those
 * corrections by payee (the normalized bank label) and, when several agree on
 * the same (group, category) and no existing rule already covers them, proposes
 * a ClassificationRule. Pure and unit-testable; suggestions are reviewed before
 * being created.
 */

import { normalizeLabel } from "./recurring";
import { classify, type RuleLike } from "./rules";

export interface ManualTx {
  description: string;
  notes?: string | null;
  group: string;
  category: string;
}

export interface RuleSuggestion {
  payee: string; // normalized label, for display
  matchValue: string; // suggested CONTAINS value for the rule
  group: string;
  category: string;
  count: number;
  samples: string[];
}

/** Pick the most distinctive token of a payee as the CONTAINS value (usually the brand). */
function suggestMatchValue(payee: string, samples: string[]): string {
  const words = payee.split(/\s+/).filter((w) => w.length >= 3);
  const candidate = words.length
    ? words.sort((a, b) => b.length - a.length)[0]
    : payee;
  // Only trust it if it actually appears in a sample description; else fall back.
  const hit = samples.some((s) => s.toLowerCase().includes(candidate.toLowerCase()));
  return hit ? candidate : payee;
}

export function suggestRules(
  manual: ManualTx[],
  existingRules: RuleLike[],
  minCount = 2
): RuleSuggestion[] {
  const groups = new Map<string, ManualTx[]>();
  for (const t of manual) {
    const payee = normalizeLabel(t.description);
    if (!payee) continue;
    const list = groups.get(payee) ?? [];
    list.push(t);
    groups.set(payee, list);
  }

  const suggestions: RuleSuggestion[] = [];
  for (const [payee, txs] of groups) {
    if (txs.length < minCount) continue;

    // All corrections for this payee must agree on the same target.
    const target = `${txs[0].group}|${txs[0].category}`;
    if (!txs.every((t) => `${t.group}|${t.category}` === target)) continue;

    // Skip if an existing active rule already classifies a sample.
    const already = classify(existingRules, {
      description: txs[0].description,
      notes: txs[0].notes ?? null,
    });
    if (already) continue;

    const samples = txs.slice(0, 3).map((t) => t.description);
    suggestions.push({
      payee,
      matchValue: suggestMatchValue(payee, samples),
      group: txs[0].group,
      category: txs[0].category,
      count: txs.length,
      samples,
    });
  }

  return suggestions.sort((a, b) => b.count - a.count);
}
