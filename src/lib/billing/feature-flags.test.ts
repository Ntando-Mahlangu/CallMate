import { describe, it, expect } from "vitest";
import { isFeatureEnabled, FEATURE_FLAGS } from "./feature-flags";

describe("isFeatureEnabled", () => {
  it("gates the SEO Engine behind Starter and above", () => {
    expect(isFeatureEnabled("FREE", FEATURE_FLAGS.SEO_ENGINE)).toBe(false);
    expect(isFeatureEnabled("STARTER", FEATURE_FLAGS.SEO_ENGINE)).toBe(true);
    expect(isFeatureEnabled("GROWTH", FEATURE_FLAGS.SEO_ENGINE)).toBe(true);
    expect(isFeatureEnabled("UNLIMITED", FEATURE_FLAGS.SEO_ENGINE)).toBe(true);
  });

  it("gates Growth Blueprint export behind Starter and above", () => {
    expect(isFeatureEnabled("FREE", FEATURE_FLAGS.GROWTH_BLUEPRINT_EXPORT)).toBe(false);
    expect(isFeatureEnabled("STARTER", FEATURE_FLAGS.GROWTH_BLUEPRINT_EXPORT)).toBe(true);
  });

  it("gates prospect exports behind Starter and above", () => {
    expect(isFeatureEnabled("FREE", FEATURE_FLAGS.PROSPECTS_EXPORT)).toBe(false);
    expect(isFeatureEnabled("STARTER", FEATURE_FLAGS.PROSPECTS_EXPORT)).toBe(true);
  });

  it("leaves team workspaces open to every tier", () => {
    expect(isFeatureEnabled("FREE", FEATURE_FLAGS.TEAM_WORKSPACES)).toBe(true);
    expect(isFeatureEnabled("STARTER", FEATURE_FLAGS.TEAM_WORKSPACES)).toBe(true);
    expect(isFeatureEnabled("GROWTH", FEATURE_FLAGS.TEAM_WORKSPACES)).toBe(true);
    expect(isFeatureEnabled("UNLIMITED", FEATURE_FLAGS.TEAM_WORKSPACES)).toBe(true);
  });
});
