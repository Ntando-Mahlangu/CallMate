import type { BusinessSnapshot, WebsiteAnalysis } from "./schema";
import type { WebsiteSignals } from "@/lib/seo/crawl";

/**
 * Plain English summary of campaign counts by status — a real, procedural
 * fact (docs/outrun/05 "BUSINESS SNAPSHOT" → Campaign Status), never an AI
 * guess. Kept as a pure function so it's testable without a DB call.
 */
export function summarizeCampaignStatus(counts: {
  ready: number;
  draft: number;
  paused: number;
  completed: number;
}): string {
  const total = counts.ready + counts.draft + counts.paused + counts.completed;
  if (total === 0) return "No campaigns yet";

  const parts = [
    counts.ready > 0 && `${counts.ready} running`,
    counts.paused > 0 && `${counts.paused} paused`,
    counts.draft > 0 && `${counts.draft} in draft`,
    counts.completed > 0 && `${counts.completed} completed`,
  ].filter((p): p is string => Boolean(p));

  return parts.join(", ");
}

/**
 * Assembles the full Business Snapshot from real, already-known data
 * (BusinessProfile/Organization/Campaign) plus the two fields that
 * genuinely require reading the business description (industry,
 * businessModel) supplied by the AI call.
 */
export function buildBusinessSnapshot(input: {
  aiFields: { industry: string; businessModel: string };
  sellingLocations: string[];
  idealCustomer: string;
  mainGoal: string;
  acquisitionChannels: string[];
  growthStage: string | null;
  avgCustomerValue: number | null;
  website: string | null;
  websiteCrawlSucceeded: boolean;
  campaignStatusCounts: { ready: number; draft: number; paused: number; completed: number };
}): BusinessSnapshot {
  const websiteStatus: BusinessSnapshot["websiteStatus"] = !input.website
    ? "Not provided"
    : input.websiteCrawlSucceeded
      ? "Provided, analyzed"
      : "Provided, could not be analyzed";

  return {
    industry: input.aiFields.industry,
    businessModel: input.aiFields.businessModel,
    targetMarket: input.sellingLocations.join(", ") || "Not specified",
    idealCustomer: input.idealCustomer,
    primaryGoal: input.mainGoal,
    primaryAcquisitionChannel: input.acquisitionChannels.join(", ") || "Not specified",
    growthStage: input.growthStage ?? "Not specified",
    estimatedCustomerValue: input.avgCustomerValue,
    websiteStatus,
    campaignStatus: summarizeCampaignStatus(input.campaignStatusCounts),
  };
}

/**
 * Merges the AI's judgment-based write-up with the plain procedural facts
 * already extracted from the crawl (src/lib/seo/local-seo.ts's same
 * verified-findings-vs-AI-suggestions split). Returns null when there are
 * no signals to analyze — the crawl's success/failure is the source of
 * truth for whether this section exists, never the AI's own choice.
 */
export function buildWebsiteAnalysis(
  aiFields: { headlineClarity: string; offerClarity: string; callsToAction: string; trustSignals: string; messaging: string } | null,
  signals: WebsiteSignals | null,
): WebsiteAnalysis | null {
  if (!signals || !aiFields) return null;

  return {
    ...aiFields,
    hasContactInfo: signals.hasContactInfo,
    hasTitle: Boolean(signals.title),
    hasMetaDescription: Boolean(signals.metaDescription),
    wordCount: signals.wordCount,
    imagesMissingAlt: signals.imagesMissingAlt,
  };
}
