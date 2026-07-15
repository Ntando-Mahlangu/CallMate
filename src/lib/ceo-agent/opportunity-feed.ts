import { prisma } from "@/lib/prisma";
import type { GrowthBlueprintData } from "@/lib/growth-blueprint/schema";
import type { ImpactLevel } from "@/components/ui/badge";

export type OpportunityFeedItem = {
  id: string;
  source: "Growth Blueprint" | "SEO Analysis" | "Unactioned Prospects" | "Reply Rate Trend";
  title: string;
  description: string;
  estimatedImpact: ImpactLevel | null;
  estimatedEffort: ImpactLevel | null;
  confidence: number | null;
  recommendedAction: string;
};

const UNACTIONED_MIN_FIT_SCORE = 70;
const TREND_WINDOW_DAYS = 14;
const TREND_MIN_SAMPLE = 5;
const TREND_MIN_DECLINE_POINTS = 10;

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

/** docs/outrun/07 "AUTONOMOUS GROWTH MODE — new companies matching ICP."
 * A live re-search against the lead-data provider on every read would
 * burn API quota silently on each page load, so this surfaces something
 * just as real and free to compute: high-fit companies Outrun already
 * found that nobody has reached out to yet. */
async function getUnactionedProspectsOpportunity(
  organizationId: string,
): Promise<OpportunityFeedItem | null> {
  const count = await prisma.company.count({
    where: {
      organizationId,
      fitScore: { gte: UNACTIONED_MIN_FIT_SCORE },
      outreachMessages: { none: {} },
    },
  });
  if (count === 0) return null;

  return {
    id: "unactioned-prospects",
    source: "Unactioned Prospects",
    title: `${count} high-fit prospect${count === 1 ? "" : "s"} found but never contacted`,
    description:
      "These companies scored as strong matches for your ideal customer profile, but no outreach has been sent to any of them yet.",
    estimatedImpact: null,
    estimatedEffort: "Low",
    confidence: null,
    recommendedAction: "Add them to a campaign, or research them individually from Prospects.",
  };
}

/** docs/outrun/07 "AUTONOMOUS GROWTH MODE — declining reply rates." A
 * real time-windowed comparison (last 14 days vs. the 14 before that),
 * not a cross-sectional bucket split — same honesty bar as the
 * Improvement Loop: only surfaces once both windows clear a minimum
 * sample size and the drop clears a minimum size, never off a couple of
 * sends. */
async function getReplyRateTrendOpportunity(
  organizationId: string,
): Promise<OpportunityFeedItem | null> {
  const [recent, prior] = await Promise.all([
    prisma.outreachMessage.findMany({
      where: {
        company: { organizationId },
        sendStatus: "SENT",
        sentAt: { gte: daysAgo(TREND_WINDOW_DAYS) },
      },
      select: { gotReply: true },
    }),
    prisma.outreachMessage.findMany({
      where: {
        company: { organizationId },
        sendStatus: "SENT",
        sentAt: { gte: daysAgo(TREND_WINDOW_DAYS * 2), lt: daysAgo(TREND_WINDOW_DAYS) },
      },
      select: { gotReply: true },
    }),
  ]);

  if (recent.length < TREND_MIN_SAMPLE || prior.length < TREND_MIN_SAMPLE) return null;

  const recentRate = Math.round((recent.filter((m) => m.gotReply).length / recent.length) * 100);
  const priorRate = Math.round((prior.filter((m) => m.gotReply).length / prior.length) * 100);
  const decline = priorRate - recentRate;
  if (decline < TREND_MIN_DECLINE_POINTS) return null;

  return {
    id: "reply-rate-trend",
    source: "Reply Rate Trend",
    title: "Reply rate has dropped recently",
    description: `Your reply rate over the last ${TREND_WINDOW_DAYS} days is ${recentRate}%, down from ${priorRate}% in the ${TREND_WINDOW_DAYS} days before that.`,
    estimatedImpact: null,
    estimatedEffort: null,
    confidence: null,
    recommendedAction: "Check the Improvement Loop on Campaigns for what's working right now.",
  };
}

/**
 * docs/outrun/10 "OPPORTUNITY FEED" and docs/outrun/07 "AUTONOMOUS GROWTH
 * MODE" share this one feed — Growth Blueprint opportunities and SEO
 * quick wins (both AI-generated), plus two real, deterministic signals
 * computed straight from send/reply data (unactioned high-fit prospects,
 * a declining reply-rate trend). Three of the doc's other autonomous
 * signals — emerging industries, competitor changes, pricing
 * observations — have no real data source anywhere in this app (no
 * market-data feed, no competitor/pricing tracking), so building
 * "detectors" for them would mean fabricating signals; they're left out
 * rather than faked. SEO quick wins aren't individually scored by the
 * AI, so their impact/confidence are left null instead of a fabricated
 * number — only their effort is set, since "quick win" already implies
 * low effort by definition.
 */
export async function getOpportunityFeed(organizationId: string): Promise<OpportunityFeedItem[]> {
  const [blueprint, seoAnalysis, unactionedProspects, replyRateTrend] = await Promise.all([
    prisma.growthBlueprint.findFirst({
      where: { organizationId },
      orderBy: { version: "desc" },
    }),
    prisma.seoAnalysis.findFirst({
      where: { organizationId },
      orderBy: { version: "desc" },
    }),
    getUnactionedProspectsOpportunity(organizationId),
    getReplyRateTrendOpportunity(organizationId),
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

  if (unactionedProspects) items.push(unactionedProspects);
  if (replyRateTrend) items.push(replyRateTrend);

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
