import { describe, it, expect } from "vitest";
import {
  monthRange,
  monthRangeBack,
  monthPartsInZone,
  monthKeyInZone,
  shiftMonth,
} from "./utils";

describe("monthRange", () => {
  it("starts at Paris midnight, not UTC midnight", () => {
    // January: Paris is UTC+1, so the month starts at 23:00 UTC on 31 Dec.
    const { gte, lt } = monthRange(2026, 1);
    expect(gte.toISOString()).toBe("2025-12-31T23:00:00.000Z");
    expect(lt.toISOString()).toBe("2026-01-31T23:00:00.000Z");
  });

  it("follows the summer offset", () => {
    // July: Paris is UTC+2.
    const { gte, lt } = monthRange(2026, 7);
    expect(gte.toISOString()).toBe("2026-06-30T22:00:00.000Z");
    expect(lt.toISOString()).toBe("2026-07-31T22:00:00.000Z");
  });

  it("rolls over the year in December", () => {
    const { lt } = monthRange(2026, 12);
    expect(lt.toISOString()).toBe("2026-12-31T23:00:00.000Z");
  });

  it("keeps a 1st-of-month row in its own month", () => {
    // The regression this helper exists for: a row entered at Paris midnight on
    // the 1st is 23:00 UTC on the last day of the previous month.
    const firstOfJuly = new Date("2026-06-30T22:00:00.000Z");
    const july = monthRange(2026, 7);
    const june = monthRange(2026, 6);
    expect(firstOfJuly >= july.gte && firstOfJuly < july.lt).toBe(true);
    expect(firstOfJuly >= june.gte && firstOfJuly < june.lt).toBe(false);
  });

  it("produces contiguous, non-overlapping windows", () => {
    for (let m = 1; m <= 11; m++) {
      expect(monthRange(2026, m).lt.getTime()).toBe(
        monthRange(2026, m + 1).gte.getTime()
      );
    }
  });
});

describe("monthRangeBack", () => {
  it("covers whole months ending before the given month", () => {
    const { gte, lt } = monthRangeBack(2026, 4, 3);
    expect(gte.getTime()).toBe(monthRange(2026, 1).gte.getTime());
    expect(lt.getTime()).toBe(monthRange(2026, 4).gte.getTime());
  });

  it("crosses the year boundary", () => {
    const { gte } = monthRangeBack(2026, 2, 3);
    expect(gte.getTime()).toBe(monthRange(2025, 11).gte.getTime());
  });
});

describe("monthPartsInZone", () => {
  it("reads an instant in Paris, not UTC", () => {
    // 30 June 22:00 UTC is already 1 July in Paris.
    expect(monthPartsInZone(new Date("2026-06-30T22:00:00.000Z"))).toEqual({
      year: 2026,
      month: 7,
    });
  });

  it("bucketes an imported row stored at UTC noon", () => {
    expect(monthPartsInZone(new Date("2026-03-01T12:00:00.000Z"))).toEqual({
      year: 2026,
      month: 3,
    });
  });

  it("formats a zero-padded sortable key", () => {
    expect(monthKeyInZone(new Date("2026-03-01T12:00:00.000Z"))).toBe("2026-03");
  });
});

describe("shiftMonth", () => {
  it("steps forward and backward across years", () => {
    expect(shiftMonth(2026, 1, -1)).toEqual({ year: 2025, month: 12 });
    expect(shiftMonth(2026, 12, 1)).toEqual({ year: 2027, month: 1 });
    expect(shiftMonth(2026, 7, 0)).toEqual({ year: 2026, month: 7 });
    expect(shiftMonth(2026, 3, -14)).toEqual({ year: 2025, month: 1 });
  });
});
