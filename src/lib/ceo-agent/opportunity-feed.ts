import { prisma } from "@/lib/prisma";
import type { GrowthBlueprintData } from "@/lib/growth-blueprint/schema";
import type { ImpactLevel } from "@/components/ui/badge";

export type OpportunityFeedItem = {
  id: string;
  source: "Growth Blueprint" | "SEO Analysis";
  title: string;
  description: string;
  estimatedImpact: ImpactLevel | null;
  estimatedEffort: ImpactLevel | null;
  confidence: number | null;
  recommendedAction: string;
};

/**
 * docs/outrun/10 "OPPORTUNITY FEED" — pulled from the AI outputs Outrun
 * already generates (Growth Blueprint opportunities, SEO quick wins)
 * rather than a separate discovery engine that would need real external
 * signals (industry trends, local business data) this app doesn't have
 * yet. SEO quick wins aren't individually scored by the AI, so their
 * impact/confidence are left null instead of a fabricated number — only
 * their effort is set, since "quick win" already implies low effort by
 * definition.
 */
export async function getOpportunityFeed(organizationId: string): Promise<OpportunityFeedItem[]> {
  const [blueprint, seoAnalysis] = await Promise.all([
    prisma.growthBlueprint.findFirst({
      where: { organizationId },
      orderBy: { version: "desc" },
    }),
    prisma.seoAnalysis.findFirst({
      where: { organizationId },
      orderBy: { version: "desc" },
    }),
  ]);

  const items: OpportunityFeedItem[] = [];

  if (blueprint) {
    const opportunities = blueprint.opportunities as GrowthBlueprintData["opportunities"];
    opportunities.forEach((o, i) => {
      items.push({
        id: `blueprint-${blueprint.version}-${i}`,
        source: "Growth Blueprint",
        title: o.title,
        description: o.description,
        estimatedImpact: o.estimatedImpact,
        estimatedEffort: o.estimatedEffort,
        confidence: o.confidence,
        recommendedAction: o.recommendedAction,
      });
    });
  }

  if (seoAnalysis) {
    const quickWins = seoAnalysis.quickWins as string[];
    quickWins.forEach((win, i) => {
      items.push({
        id: `seo-${seoAnalysis.version}-${i}`,
        source: "SEO Analysis",
        title: win,
        description: "Identified as a quick win in your latest SEO analysis.",
        estimatedImpact: null,
        estimatedEffort: "Low",
        confidence: null,
        recommendedAction: "Review and implement from the SEO page.",
      });
    });
  }

  return items;
}

export type OpportunitySort = "roi" | "fastest" | "lowest-effort" | "confidence";

const IMPACT_WEIGHT: Record<ImpactLevel, number> = { High: 3, Medium: 2, Low: 1 };
const EFFORT_EASE_WEIGHT: Record<ImpactLevel, number> = { Low: 3, Medium: 2, High: 1 };

/**
 * docs/outrun/10 "OPPORTUNITY FEED" sort options. "Highest ROI" is a
 * transparent, computed proxy (impact × ease of effort) from the labels
 * above — not a fabricated dollar figure. Items missing a dimension (e.g.
 * SEO quick wins have no impact score) sort after items that have it.
 */
export function sortOpportunities(
  items: OpportunityFeedItem[],
  sort: OpportunitySort,
): OpportunityFeedItem[] {
  const impact = (i: OpportunityFeedItem) => (i.estimatedImpact ? IMPACT_WEIGHT[i.estimatedImpact] : 0);
  const ease = (i: OpportunityFeedItem) =>
    i.estimatedEffort ? EFFORT_EASE_WEIGHT[i.estimatedEffort] : 0;
  const confidence = (i: OpportunityFeedItem) => i.confidence ?? -1;

  const sorted = [...items];
  switch (sort) {
    case "roi":
      sorted.sort((a, b) => impact(b) * ease(b) - impact(a) * ease(a));
      break;
    case "fastest":
      sorted.sort((a, b) => ease(b) - ease(a) || impact(b) - impact(a));
      break;
    case "lowest-effort":
      sorted.sort((a, b) => ease(b) - ease(a));
      break;
    case "confidence":
      sorted.sort((a, b) => confidence(b) - confidence(a));
      break;
  }
  return sorted;
}
