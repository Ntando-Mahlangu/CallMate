import { describe, it, expect } from "vitest";
import type { PlanTier } from "@prisma/client";
import {
  isFeatureEnabled,
  evaluateFlag,
  hashToPercentageBucket,
  FEATURE_FLAGS,
  type FlagConfig,
} from "./feature-flags";

const ORG_ID = "org-1";

function config(tiers: PlanTier[], overrides: Partial<FlagConfig> = {}): FlagConfig {
  return { tiers, ...overrides };
}

describe("isFeatureEnabled", () => {
  it("gates the SEO Engine behind Starter and above", () => {
    expect(isFeatureEnabled("FREE", FEATURE_FLAGS.SEO_ENGINE, ORG_ID)).toBe(false);
    expect(isFeatureEnabled("STARTER", FEATURE_FLAGS.SEO_ENGINE, ORG_ID)).toBe(true);
    expect(isFeatureEnabled("GROWTH", FEATURE_FLAGS.SEO_ENGINE, ORG_ID)).toBe(true);
    expect(isFeatureEnabled("UNLIMITED", FEATURE_FLAGS.SEO_ENGINE, ORG_ID)).toBe(true);
  });

  it("gates Growth Blueprint export behind Starter and above", () => {
    expect(isFeatureEnabled("FREE", FEATURE_FLAGS.GROWTH_BLUEPRINT_EXPORT, ORG_ID)).toBe(false);
    expect(isFeatureEnabled("STARTER", FEATURE_FLAGS.GROWTH_BLUEPRINT_EXPORT, ORG_ID)).toBe(true);
  });

  it("gates prospect exports behind Starter and above", () => {
    expect(isFeatureEnabled("FREE", FEATURE_FLAGS.PROSPECTS_EXPORT, ORG_ID)).toBe(false);
    expect(isFeatureEnabled("STARTER", FEATURE_FLAGS.PROSPECTS_EXPORT, ORG_ID)).toBe(true);
  });

  it("leaves team workspaces open to every tier", () => {
    expect(isFeatureEnabled("FREE", FEATURE_FLAGS.TEAM_WORKSPACES, ORG_ID)).toBe(true);
    expect(isFeatureEnabled("STARTER", FEATURE_FLAGS.TEAM_WORKSPACES, ORG_ID)).toBe(true);
    expect(isFeatureEnabled("GROWTH", FEATURE_FLAGS.TEAM_WORKSPACES, ORG_ID)).toBe(true);
    expect(isFeatureEnabled("UNLIMITED", FEATURE_FLAGS.TEAM_WORKSPACES, ORG_ID)).toBe(true);
  });

  it("gives the same organization the same rollout decision every time (deterministic, not a coin flip)", () => {
    const results = Array.from({ length: 5 }, () =>
      isFeatureEnabled("STARTER", FEATURE_FLAGS.SEO_ENGINE, "same-org-id"),
    );
    expect(new Set(results).size).toBe(1);
  });
});

describe("evaluateFlag", () => {
  it("blocks everyone when instantly disabled, regardless of tier or rollout", () => {
    const c = config(["FREE", "STARTER", "GROWTH", "UNLIMITED"], { enabled: false, rolloutPercentage: 100 });
    expect(evaluateFlag(c, "UNLIMITED", "any-org")).toBe(false);
  });

  it("passes everyone through at 100% rollout (the default)", () => {
    const c = config(["STARTER"]);
    expect(evaluateFlag(c, "STARTER", "org-a")).toBe(true);
    expect(evaluateFlag(c, "STARTER", "org-b")).toBe(true);
  });

  it("blocks everyone at 0% rollout", () => {
    const c = config(["STARTER"], { rolloutPercentage: 0 });
    expect(evaluateFlag(c, "STARTER", "org-a")).toBe(false);
    expect(evaluateFlag(c, "STARTER", "org-b")).toBe(false);
  });

  it("still enforces the tier check even at 100% rollout", () => {
    const c = config(["STARTER"], { rolloutPercentage: 100 });
    expect(evaluateFlag(c, "FREE", "org-a")).toBe(false);
  });

  it("splits organizations between in/out at a partial rollout percentage, consistently per org", () => {
    const c = config(["STARTER"], { rolloutPercentage: 50 });
    const orgs = Array.from({ length: 100 }, (_, i) => `org-${i}`);
    const included = orgs.filter((org) => evaluateFlag(c, "STARTER", org));
    // Not asserting exactly 50 — hashing won't split perfectly evenly for
    // any finite sample — just that it's a genuine partial split, not
    // all-or-nothing, and every org's own result is stable.
    expect(included.length).toBeGreaterThan(20);
    expect(included.length).toBeLessThan(80);
    for (const org of orgs) {
      expect(evaluateFlag(c, "STARTER", org)).toBe(evaluateFlag(c, "STARTER", org));
    }
  });
});

describe("hashToPercentageBucket", () => {
  it("is deterministic for the same input", () => {
    expect(hashToPercentageBucket("abc")).toBe(hashToPercentageBucket("abc"));
  });

  it("always returns a value in [0, 100)", () => {
    for (const input of ["a", "org-123", "", "z".repeat(50)]) {
      const bucket = hashToPercentageBucket(input);
      expect(bucket).toBeGreaterThanOrEqual(0);
      expect(bucket).toBeLessThan(100);
    }
  });

  it("distributes different inputs across different buckets", () => {
    const buckets = new Set(
      Array.from({ length: 200 }, (_, i) => hashToPercentageBucket(`org-${i}`)),
    );
    // Not asserting a specific count — just that 200 distinct org ids don't
    // all collapse into a single bucket (would indicate a broken hash).
    expect(buckets.size).toBeGreaterThan(20);
  });
});
