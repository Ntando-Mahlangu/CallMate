import { describe, expect, it } from "vitest";
import { formatCurrency, formatDate } from "./format";

describe("formatDate", () => {
  it("formats a Date using the given locale", () => {
    const result = formatDate(new Date("2026-07-15T12:00:00Z"), "en", { dateStyle: "medium" });
    expect(result).toBe("Jul 15, 2026");
  });

  it("accepts an ISO string in place of a Date", () => {
    const result = formatDate("2026-07-15T12:00:00Z", "en", { dateStyle: "medium" });
    expect(result).toBe("Jul 15, 2026");
  });

  it("defaults to the default locale when none is given", () => {
    const result = formatDate(new Date("2026-07-15T12:00:00Z"), undefined, { dateStyle: "medium" });
    expect(result).toBe("Jul 15, 2026");
  });
});

describe("formatCurrency", () => {
  it("formats an amount as USD by default", () => {
    expect(formatCurrency(49)).toBe("$49.00");
  });

  it("formats a different currency code", () => {
    expect(formatCurrency(49, "EUR")).toContain("49.00");
  });
});
