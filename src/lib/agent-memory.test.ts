import { describe, it, expect } from "vitest";
import { buildMemorySection } from "./agent-memory";

describe("buildMemorySection", () => {
  it("returns an empty string when there are no facts yet", () => {
    expect(buildMemorySection([])).toBe("");
  });

  it("renders each fact as a bullet", () => {
    const section = buildMemorySection([
      { id: "1", content: "MCAN paie Adrien ; Street Kred paie MCAN." },
      { id: "2", content: "Cristian Mallama = neveu, prêt familial, pas un revenu." },
    ]);
    expect(section).toContain("- MCAN paie Adrien ; Street Kred paie MCAN. (id: 1)");
    expect(section).toContain("- Cristian Mallama = neveu, prêt familial, pas un revenu. (id: 2)");
  });
});
