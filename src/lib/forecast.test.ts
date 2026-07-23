import { describe, it, expect } from "vitest";
import { averageNetFlow, forecast, firstShortfall } from "./forecast";

describe("averageNetFlow", () => {
  it("averages income − expenses − savings across months", () => {
    const flow = averageNetFlow([
      { income: 3000, expenses: 2000, savings: 500 }, // +500
      { income: 3000, expenses: 2200, savings: 500 }, // +300
    ]);
    expect(flow).toBe(400);
  });

  it("is zero for an empty series", () => {
    expect(averageNetFlow([])).toBe(0);
  });
});

describe("forecast", () => {
  it("projects the balance forward month by month", () => {
    const pts = forecast(1000, 400, 3, 2026, 11);
    expect(pts).toHaveLength(3);
    expect(pts[0]).toEqual({ key: "2026-12", projected: 1400 });
    expect(pts[1]).toEqual({ key: "2027-01", projected: 1800 });
    expect(pts[2]).toEqual({ key: "2027-02", projected: 2200 });
  });

  it("projects a decline when the net flow is negative", () => {
    const pts = forecast(500, -300, 3, 2026, 1);
    expect(pts.map((p) => p.projected)).toEqual([200, -100, -400]);
  });
});

describe("firstShortfall", () => {
  it("finds the first month the balance goes negative", () => {
    const pts = forecast(500, -300, 4, 2026, 1);
    expect(firstShortfall(pts)!.key).toBe("2026-03"); // 500 → 200 → -100
  });

  it("returns null when the balance stays positive", () => {
    expect(firstShortfall(forecast(1000, 100, 6, 2026, 1))).toBeNull();
  });
});
