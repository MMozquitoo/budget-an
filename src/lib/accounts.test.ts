import { describe, it, expect } from "vitest";
import { parseAccount, accountBreakdown } from "./accounts";

describe("parseAccount", () => {
  it("extracts the account before the ' | ' separator", () => {
    expect(parseAccount("Boursorama | Food & Dining > Coffee shop")).toBe("Boursorama");
    expect(parseAccount("N26 | Transport > Uber")).toBe("N26");
  });

  it("returns null when there is no account segment", () => {
    expect(parseAccount(null)).toBeNull();
    expect(parseAccount("")).toBeNull();
    expect(parseAccount("just a free note")).toBeNull();
    expect(parseAccount(" | orphan")).toBeNull();
  });
});

describe("accountBreakdown", () => {
  const tx = (notes: string | null, group: string, amount: number) => ({ notes, group, amount });

  it("groups income and outflow per account", () => {
    const rows = accountBreakdown([
      tx("Boursorama | X > Y", "INCOME", 2000),
      tx("Boursorama | X > Y", "VARIABLE_EXPENSE", 300),
      tx("Boursorama | X > Y", "SAVINGS", 200),
      tx("N26 | X > Y", "VARIABLE_EXPENSE", 150),
      tx(null, "FIXED_EXPENSE", 50), // no account → "Autre"
    ]);

    const bourso = rows.find((r) => r.account === "Boursorama")!;
    expect(bourso.income).toBe(2000);
    expect(bourso.outflow).toBe(500); // 300 + 200 (savings counts as outflow)
    expect(bourso.net).toBe(1500);
    expect(bourso.count).toBe(3);

    expect(rows.find((r) => r.account === "N26")!.outflow).toBe(150);
    expect(rows.find((r) => r.account === "Autre")!.outflow).toBe(50);
  });

  it("sorts by outflow descending", () => {
    const rows = accountBreakdown([
      tx("A | x > y", "VARIABLE_EXPENSE", 100),
      tx("B | x > y", "VARIABLE_EXPENSE", 500),
    ]);
    expect(rows[0].account).toBe("B");
  });
});
