import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// plans.ts reads its Paddle price IDs from env vars at module load time, so
// each scenario needs a fresh module instance under its own env — the same
// vi.stubEnv + resetModules pattern used elsewhere for env-dependent modules.
describe("planTierForPriceId", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("resolves a configured tier's price ID back to that tier", async () => {
    vi.stubEnv("NEXT_PUBLIC_PADDLE_STARTER_PRICE_ID", "pri_starter_123");
    vi.stubEnv("NEXT_PUBLIC_PADDLE_GROWTH_PRICE_ID", "pri_growth_456");
    vi.stubEnv("NEXT_PUBLIC_PADDLE_UNLIMITED_PRICE_ID", "pri_unlimited_789");
    const { planTierForPriceId } = await import("./plans");

    expect(planTierForPriceId("pri_starter_123")).toBe("STARTER");
    expect(planTierForPriceId("pri_growth_456")).toBe("GROWTH");
    expect(planTierForPriceId("pri_unlimited_789")).toBe("UNLIMITED");
  });

  it("returns null for a price ID that matches no configured tier", async () => {
    vi.stubEnv("NEXT_PUBLIC_PADDLE_STARTER_PRICE_ID", "pri_starter_123");
    const { planTierForPriceId } = await import("./plans");

    expect(planTierForPriceId("pri_unknown")).toBeNull();
  });

  it("returns null for a null price ID", async () => {
    const { planTierForPriceId } = await import("./plans");
    expect(planTierForPriceId(null)).toBeNull();
  });

  it("returns null for an unconfigured tier even if some other tier is configured", async () => {
    vi.stubEnv("NEXT_PUBLIC_PADDLE_STARTER_PRICE_ID", "pri_starter_123");
    // Growth/Unlimited deliberately left unset.
    const { planTierForPriceId } = await import("./plans");

    expect(planTierForPriceId("pri_growth_456")).toBeNull();
  });
});
