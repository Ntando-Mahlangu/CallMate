import type { PlanTier } from "@prisma/client";

// docs/outrun/14 "FEATURE GATING" — "Every feature checks plan access.
// Never hard-code plan names. Use feature flags." Flag keys mirror the
// doc's own dot-namespaced examples so a plan/pricing change only ever
// means editing the tier list below, never touching a call site's logic.
export const FEATURE_FLAGS = {
  SEO_ENGINE: "seo.engine",
  GROWTH_BLUEPRINT_EXPORT: "growth_blueprint.export",
  TEAM_WORKSPACES: "team.workspaces",
  PROSPECTS_EXPORT: "prospects.export",
} as const;

export type FeatureFlag = (typeof FEATURE_FLAGS)[keyof typeof FEATURE_FLAGS];

// Only FREE and STARTER have a real Paddle price today (src/lib/billing/plans.ts)
// — gating anything behind GROWTH/UNLIMITED would make it permanently
// unreachable since no one can actually subscribe to those tiers yet.
// TEAM_WORKSPACES is deliberately open to every tier (matching the same
// call already made in src/lib/teams/invite.ts's doc comment) rather than
// locked behind a plan nobody can buy.
const FLAG_TIERS: Record<FeatureFlag, PlanTier[]> = {
  [FEATURE_FLAGS.SEO_ENGINE]: ["STARTER", "GROWTH", "UNLIMITED"],
  [FEATURE_FLAGS.GROWTH_BLUEPRINT_EXPORT]: ["STARTER", "GROWTH", "UNLIMITED"],
  [FEATURE_FLAGS.TEAM_WORKSPACES]: ["FREE", "STARTER", "GROWTH", "UNLIMITED"],
  [FEATURE_FLAGS.PROSPECTS_EXPORT]: ["STARTER", "GROWTH", "UNLIMITED"],
};

export function isFeatureEnabled(planTier: PlanTier, flag: FeatureFlag): boolean {
  return FLAG_TIERS[flag].includes(planTier);
}
