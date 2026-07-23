import { describe, it, expect, beforeEach } from "vitest";
import { rateLimit, _resetRateLimit } from "./rate-limit";

describe("rateLimit", () => {
  beforeEach(() => _resetRateLimit());

  it("allows up to the limit, then blocks within the window", () => {
    const key = "ip:1";
    for (let i = 0; i < 3; i++) {
      expect(rateLimit(key, 3, 1000, 0).allowed).toBe(true);
    }
    expect(rateLimit(key, 3, 1000, 0).allowed).toBe(false);
  });

  it("reports remaining hits", () => {
    const r1 = rateLimit("ip:2", 5, 1000, 0);
    expect(r1.remaining).toBe(4);
    const r2 = rateLimit("ip:2", 5, 1000, 0);
    expect(r2.remaining).toBe(3);
  });

  it("resets after the window passes", () => {
    rateLimit("ip:3", 1, 1000, 0);
    expect(rateLimit("ip:3", 1, 1000, 500).allowed).toBe(false); // still in window
    expect(rateLimit("ip:3", 1, 1000, 1001).allowed).toBe(true); // window elapsed
  });

  it("keys are independent", () => {
    rateLimit("a", 1, 1000, 0);
    expect(rateLimit("a", 1, 1000, 0).allowed).toBe(false);
    expect(rateLimit("b", 1, 1000, 0).allowed).toBe(true);
  });
});
