import { describe, it, expect } from "vitest";
import { suggestRules as suggestRulesRaw, type ManualTx } from "./autorules";
import type { RuleLike } from "./rules";
import { DEFAULT_CATEGORIES_BY_GROUP } from "./test-taxonomy";

const suggestRules = (manual: ManualTx[], existingRules: RuleLike[], minCount?: number) =>
  suggestRulesRaw(manual, existingRules, DEFAULT_CATEGORIES_BY_GROUP, minCount);

const tx = (description: string, group: string, category: string): ManualTx => ({
  description,
  group,
  category,
});

describe("suggestRules", () => {
  it("suggests a rule when a payee is corrected repeatedly to the same target", () => {
    const manual = [
      tx("PRLV SEPA NETFLIX 112233", "FIXED_EXPENSE", "SUBSCRIPTIONS"),
      tx("PRLV SEPA NETFLIX 998877", "FIXED_EXPENSE", "SUBSCRIPTIONS"),
    ];
    const out = suggestRules(manual, []);
    expect(out).toHaveLength(1);
    expect(out[0].group).toBe("FIXED_EXPENSE");
    expect(out[0].category).toBe("SUBSCRIPTIONS");
    expect(out[0].count).toBe(2);
    expect(out[0].matchValue.toLowerCase()).toContain("netflix");
  });

  it("needs at least minCount corrections", () => {
    const out = suggestRules([tx("NETFLIX", "FIXED_EXPENSE", "SUBSCRIPTIONS")], []);
    expect(out).toHaveLength(0);
  });

  it("skips payees whose corrections disagree on the target", () => {
    const manual = [
      tx("AMAZON 111", "VARIABLE_EXPENSE", "ENTERTAINMENT"),
      tx("AMAZON 222", "VARIABLE_EXPENSE", "GIFTS"),
    ];
    expect(suggestRules(manual, [])).toHaveLength(0);
  });

  it("skips payees already covered by an existing rule", () => {
    const manual = [
      tx("NETFLIX 111", "FIXED_EXPENSE", "SUBSCRIPTIONS"),
      tx("NETFLIX 222", "FIXED_EXPENSE", "SUBSCRIPTIONS"),
    ];
    const rules: RuleLike[] = [
      { matchType: "CONTAINS", matchValue: "netflix", group: "FIXED_EXPENSE", category: "SUBSCRIPTIONS", active: true },
    ];
    expect(suggestRules(manual, rules)).toHaveLength(0);
  });

  it("ranks by number of corrections", () => {
    const manual = [
      tx("NETFLIX 1", "FIXED_EXPENSE", "SUBSCRIPTIONS"),
      tx("NETFLIX 2", "FIXED_EXPENSE", "SUBSCRIPTIONS"),
      tx("SPOTIFY 1", "FIXED_EXPENSE", "SUBSCRIPTIONS"),
      tx("SPOTIFY 2", "FIXED_EXPENSE", "SUBSCRIPTIONS"),
      tx("SPOTIFY 3", "FIXED_EXPENSE", "SUBSCRIPTIONS"),
    ];
    const out = suggestRules(manual, []);
    expect(out[0].payee).toContain("spotify");
    expect(out[0].count).toBe(3);
  });
});
