import { describe, it, expect } from "vitest";
import {
  computeProgress,
  buildGoalReport,
  categoriesForGoal,
  isSavingsCategory,
} from "./savings-goals";

const goal = (overrides = {}) => ({
  targetAmount: 10000,
  startDate: new Date("2026-01-01T00:00:00Z"),
  targetDate: new Date("2026-12-31T00:00:00Z"),
  ...overrides,
});

describe("computeProgress", () => {
  it("is met once saved reaches the target, even mid-period", () => {
    const p = computeProgress(goal(), 10500, new Date("2026-06-01"));
    expect(p.health).toBe("met");
    expect(p.remaining).toBe(0);
  });

  it("is on-track when saved is close to the linear trajectory", () => {
    // ~41.6% of the year elapsed by June 1 → expected ≈ 4159; 4000 is within 90% tolerance.
    const p = computeProgress(goal(), 4000, new Date("2026-06-01"));
    expect(p.health).toBe("on-track");
  });

  it("is behind when saved trails the linear trajectory beyond tolerance", () => {
    const p = computeProgress(goal(), 500, new Date("2026-06-01"));
    expect(p.health).toBe("behind");
  });

  it("is overdue when the deadline passed unmet", () => {
    const p = computeProgress(goal(), 3000, new Date("2027-01-15"));
    expect(p.health).toBe("overdue");
    expect(p.daysRemaining).toBeLessThan(0);
  });

  it("is met, not overdue, if the target was reached after the deadline", () => {
    const p = computeProgress(goal(), 10000, new Date("2027-01-15"));
    expect(p.health).toBe("met");
  });

  it("treats a zero-duration goal (targetDate == startDate) as immediately due", () => {
    const zero = goal({ startDate: new Date("2026-06-01"), targetDate: new Date("2026-06-01") });
    expect(computeProgress(zero, 10000, new Date("2026-06-01")).health).toBe("met");
    // Deadline is today, not yet passed → "behind" (100% expected, not met), not "overdue" yet.
    expect(computeProgress(zero, 100, new Date("2026-06-01")).health).toBe("behind");
    // One day later, still unmet → now it's overdue.
    expect(computeProgress(zero, 100, new Date("2026-06-02")).health).toBe("overdue");
  });

  it("treats a goal whose target date precedes its start date as already due", () => {
    const backdated = goal({ startDate: new Date("2026-08-01"), targetDate: new Date("2026-06-01") });
    const p = computeProgress(backdated, 100, new Date("2026-08-15"));
    expect(p.health).toBe("overdue");
  });
});

describe("categoriesForGoal / isSavingsCategory", () => {
  it("returns just the chosen category when set", () => {
    expect(categoriesForGoal("TRAVEL_FUND")).toEqual(["TRAVEL_FUND"]);
  });

  it("returns the whole SAVINGS group when null", () => {
    const cats = categoriesForGoal(null);
    expect(cats).toContain("EMERGENCY_FUND");
    expect(cats).toContain("INVESTMENT");
  });

  it("validates SAVINGS-only categories", () => {
    expect(isSavingsCategory("TRAVEL_FUND")).toBe(true);
    expect(isSavingsCategory("GROCERIES")).toBe(false);
  });
});

describe("buildGoalReport", () => {
  it("merges saved totals and sorts by soonest deadline", () => {
    const goals = [
      {
        id: "b", name: "B", targetAmount: 1000,
        targetDate: new Date("2026-12-01"), startDate: new Date("2026-01-01"),
        category: null,
      },
      {
        id: "a", name: "A", targetAmount: 1000,
        targetDate: new Date("2026-08-01"), startDate: new Date("2026-01-01"),
        category: "TRAVEL_FUND",
      },
    ];
    const lines = buildGoalReport(goals, { a: 500, b: 200 }, new Date("2026-06-01"));
    expect(lines.map((l) => l.id)).toEqual(["a", "b"]);
    expect(lines[0].saved).toBe(500);
  });

  it("defaults saved to 0 for a goal with no matching transactions", () => {
    const goals = [
      {
        id: "c", name: "C", targetAmount: 500,
        targetDate: new Date("2026-12-01"), startDate: new Date("2026-01-01"),
        category: null,
      },
    ];
    const lines = buildGoalReport(goals, {});
    expect(lines[0].saved).toBe(0);
  });
});
