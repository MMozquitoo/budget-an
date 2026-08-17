import { describe, it, expect } from "vitest";
import { slugifyForKey, pickThemeForNewGroup } from "./taxonomy-helpers";

describe("slugifyForKey", () => {
  it("uppercases and strips accents", () => {
    expect(slugifyForKey("Vacances", [])).toBe("VACANCES");
    expect(slugifyForKey("Père (ISF)", [])).toBe("PERE_ISF");
    expect(slugifyForKey("Été à Noël", [])).toBe("ETE_A_NOEL");
  });

  it("appends a numeric suffix on collision instead of overwriting", () => {
    expect(slugifyForKey("Vacances", ["VACANCES"])).toBe("VACANCES_2");
    expect(slugifyForKey("Vacances", ["VACANCES", "VACANCES_2"])).toBe("VACANCES_3");
  });

  it("falls back to a generic key for a label with no usable characters", () => {
    expect(slugifyForKey("!!!", [])).toBe("CATEGORY");
  });
});

describe("pickThemeForNewGroup", () => {
  it("picks an unused theme first", () => {
    const theme = pickThemeForNewGroup(["emerald", "blue"]);
    expect(["teal", "pink", "cyan"]).toContain(theme);
  });

  it("cycles once every custom theme is taken", () => {
    const theme = pickThemeForNewGroup(["teal", "pink", "cyan"]);
    expect(["teal", "pink", "cyan"]).toContain(theme);
  });
});
