import { describe, expect, it } from "vitest";
import { shouldAutoPauseForFailures } from "./autonomous";

describe("shouldAutoPauseForFailures", () => {
  it("never pauses below the minimum sample size, even at 100% failure", () => {
    expect(shouldAutoPauseForFailures(1, 1)).toBe(false);
    expect(shouldAutoPauseForFailures(2, 2)).toBe(false);
  });

  it("pauses once the failure rate reaches 50% at the minimum sample size", () => {
    expect(shouldAutoPauseForFailures(3, 1)).toBe(false);
    expect(shouldAutoPauseForFailures(4, 2)).toBe(true);
  });

  it("pauses on a majority-failing larger run", () => {
    expect(shouldAutoPauseForFailures(10, 6)).toBe(true);
  });

  it("does not pause on a mostly-succeeding larger run", () => {
    expect(shouldAutoPauseForFailures(10, 2)).toBe(false);
  });

  it("does not pause when nothing was attempted", () => {
    expect(shouldAutoPauseForFailures(0, 0)).toBe(false);
  });
});
