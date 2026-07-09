import type { GrowthBlueprint } from "@prisma/client";
import type { GrowthBlueprintData } from "@/lib/growth-blueprint/schema";

export type TodaysMission = {
  action: string;
  reason: string;
  estimatedTime: string | null;
  expectedImpact: GrowthBlueprintData["roadmap"][number]["expectedImpact"];
  confidence: number | null;
  source: "roadmap" | "opportunity";
};

/**
 * The dashboard shows exactly one "next best action" (docs/outrun/04
 * "TODAY'S MISSION"). Prefer a roadmap item explicitly scheduled for
 * today; fall back to the highest-confidence high-priority opportunity
 * if the Blueprint didn't schedule anything for today.
 */
export function getTodaysMission(blueprint: GrowthBlueprint): TodaysMission | null {
  const roadmap = blueprint.roadmap as GrowthBlueprintData["roadmap"];
  const opportunities = blueprint.opportunities as GrowthBlueprintData["opportunities"];

  const todayItem = roadmap.find((item) => item.horizon === "Today");
  if (todayItem) {
    return {
      action: todayItem.action,
      reason: todayItem.reason,
      estimatedTime: todayItem.estimatedTime,
      expectedImpact: todayItem.expectedImpact,
      confidence: null,
      source: "roadmap",
    };
  }

  const topOpportunity = [...opportunities].sort((a, b) => {
    if (a.priority !== b.priority) return a.priority === "High" ? -1 : 1;
    return b.confidence - a.confidence;
  })[0];

  if (!topOpportunity) return null;

  return {
    action: topOpportunity.recommendedAction,
    reason: topOpportunity.description,
    estimatedTime: null,
    expectedImpact: topOpportunity.estimatedImpact,
    confidence: topOpportunity.confidence,
    source: "opportunity",
  };
}
