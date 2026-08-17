import { describe, it, expect } from "vitest";
import {
  classify as classifyRaw,
  matchesRule,
  validateRegex,
  isCategoryInGroup as isCategoryInGroupRaw,
} from "./rules";
import { DEFAULT_CATEGORIES_BY_GROUP } from "./test-taxonomy";

const classify = (rules: Parameters<typeof classifyRaw>[0], fields: Parameters<typeof classifyRaw>[1]) =>
  classifyRaw(rules, fields, DEFAULT_CATEGORIES_BY_GROUP);
const isCategoryInGroup = (group: string, category: string) =>
  isCategoryInGroupRaw(group, category, DEFAULT_CATEGORIES_BY_GROUP);

const rule = (over: Partial<Parameters<typeof matchesRule>[0]> = {}) => ({
  matchValue: "netflix",
  group: "FIXED_EXPENSE",
  category: "SUBSCRIPTIONS",
  ...over,
});

describe("matchesRule", () => {
  it("matches case-insensitively on a substring by default", () => {
    expect(matchesRule(rule(), { description: "CARTE 12/03 NETFLIX.COM" })).toBe(true);
    expect(matchesRule(rule(), { description: "SPOTIFY" })).toBe(false);
  });

  it("honours each match type", () => {
    const fields = { description: "PRLV SEPA EDF FACTURE" };
    expect(matchesRule(rule({ matchType: "STARTS_WITH", matchValue: "prlv" }), fields)).toBe(true);
    expect(matchesRule(rule({ matchType: "ENDS_WITH", matchValue: "facture" }), fields)).toBe(true);
    expect(matchesRule(rule({ matchType: "EXACT", matchValue: "prlv sepa edf facture" }), fields)).toBe(true);
    expect(matchesRule(rule({ matchType: "EXACT", matchValue: "edf" }), fields)).toBe(false);
    expect(matchesRule(rule({ matchType: "REGEX", matchValue: "^prlv .*edf" }), fields)).toBe(true);
  });

  it("can match on notes or on both fields", () => {
    const fields = { description: "VIR INST", notes: "N26 | Bills & Utilities > Internet" };
    expect(matchesRule(rule({ matchField: "notes", matchValue: "internet" }), fields)).toBe(true);
    expect(matchesRule(rule({ matchField: "description", matchValue: "internet" }), fields)).toBe(false);
    expect(matchesRule(rule({ matchField: "all", matchValue: "internet" }), fields)).toBe(true);
  });

  it("never throws on an invalid regex — it just does not match", () => {
    expect(matchesRule(rule({ matchType: "REGEX", matchValue: "([unclosed" }), { description: "x" })).toBe(false);
  });

  it("ignores an empty pattern or an empty subject", () => {
    expect(matchesRule(rule({ matchValue: "" }), { description: "netflix" })).toBe(false);
    expect(matchesRule(rule(), { description: "" })).toBe(false);
  });
});

describe("validateRegex", () => {
  it("accepts an ordinary pattern", () => {
    expect(validateRegex("^edf|engie$").ok).toBe(true);
  });

  it("rejects a pattern that cannot compile", () => {
    expect(validateRegex("([unclosed").ok).toBe(false);
  });

  it("rejects catastrophic backtracking shapes", () => {
    // (a+)+ against a long non-matching subject is the classic ReDoS trigger.
    expect(validateRegex("(a+)+$").ok).toBe(false);
    expect(validateRegex("[a-z]*+").ok).toBe(false);
  });

  it("rejects an over-long pattern", () => {
    expect(validateRegex("a".repeat(201)).ok).toBe(false);
  });
});

describe("classify", () => {
  const rules = [
    { id: "1", name: "Netflix", priority: 0, matchValue: "netflix", group: "FIXED_EXPENSE", category: "SUBSCRIPTIONS" },
    { id: "2", name: "Courses", priority: 0, matchValue: "carrefour", group: "VARIABLE_EXPENSE", category: "GROCERIES" },
  ];

  it("returns the matching rule's classification", () => {
    expect(classify(rules, { description: "CARREFOUR MARKET" })).toMatchObject({
      group: "VARIABLE_EXPENSE",
      category: "GROCERIES",
      ruleId: "2",
    });
  });

  it("returns null when nothing matches, so the caller can fall back", () => {
    expect(classify(rules, { description: "BOULANGERIE" })).toBeNull();
  });

  it("lets the highest priority win when several rules match", () => {
    const overlapping = [
      { id: "generic", priority: 1, matchValue: "sncf", group: "VARIABLE_EXPENSE", category: "TRANSPORT_VARIABLE" },
      { id: "specific", priority: 10, matchValue: "sncf abonnement", group: "FIXED_EXPENSE", category: "TRANSPORT_FIXED" },
    ];
    expect(classify(overlapping, { description: "SNCF ABONNEMENT MENSUEL" })?.ruleId).toBe("specific");
  });

  it("skips inactive rules", () => {
    const inactive = [{ ...rules[0], active: false }];
    expect(classify(inactive, { description: "NETFLIX" })).toBeNull();
  });

  it("skips rules whose category does not belong to their group", () => {
    const incoherent = [{ id: "bad", matchValue: "netflix", group: "INCOME", category: "RENT" }];
    expect(classify(incoherent, { description: "NETFLIX" })).toBeNull();
  });
});

describe("isCategoryInGroup", () => {
  it("accepts a category filed under its own group", () => {
    expect(isCategoryInGroup("VARIABLE_EXPENSE", "GROCERIES")).toBe(true);
  });

  it("rejects a mismatched pair", () => {
    expect(isCategoryInGroup("INCOME", "GROCERIES")).toBe(false);
    expect(isCategoryInGroup("NOT_A_GROUP", "GROCERIES")).toBe(false);
  });
});
