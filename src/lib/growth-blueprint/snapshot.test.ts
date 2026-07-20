import { describe, it, expect } from "vitest";
import { summarizeCampaignStatus, buildBusinessSnapshot, buildWebsiteAnalysis } from "./snapshot";
import type { WebsiteSignals } from "@/lib/seo/crawl";

describe("summarizeCampaignStatus", () => {
  it("reports no campaigns when every count is zero", () => {
    expect(summarizeCampaignStatus({ ready: 0, draft: 0, paused: 0, completed: 0 })).toBe(
      "No campaigns yet",
    );
  });

  it("lists only non-zero statuses in a fixed order", () => {
    expect(summarizeCampaignStatus({ ready: 2, draft: 0, paused: 1, completed: 3 })).toBe(
      "2 running, 1 paused, 3 completed",
    );
  });
});

function signals(overrides: Partial<WebsiteSignals> = {}): WebsiteSignals {
  return {
    url: "https://example.com",
    title: "Example Plumbing",
    metaDescription: "We fix pipes.",
    h1s: ["Example Plumbing"],
    h2s: [],
    wordCount: 250,
    hasContactInfo: true,
    hasForm: false,
    linkCount: 5,
    imageCount: 3,
    imagesMissingAlt: 1,
    hasGoogleMapsEmbed: false,
    hasStreetAddressPattern: false,
    bodyTextLower: "example plumbing",
    ...overrides,
  };
}

describe("buildBusinessSnapshot", () => {
  const base = {
    aiFields: { industry: "Plumbing", businessModel: "Service-based" },
    sellingLocations: ["Local"],
    idealCustomer: "Homeowners with older pipes",
    mainGoal: "First customer",
    acquisitionChannels: ["Referrals", "Word of Mouth"],
    growthStage: "STARTUP",
    avgCustomerValue: 400,
    website: "https://example.com",
    websiteCrawlSucceeded: true,
    campaignStatusCounts: { ready: 1, draft: 0, paused: 0, completed: 0 },
  };

  it("assembles every field from the given inputs", () => {
    const snapshot = buildBusinessSnapshot(base);
    expect(snapshot).toEqual({
      industry: "Plumbing",
      businessModel: "Service-based",
      targetMarket: "Local",
      idealCustomer: "Homeowners with older pipes",
      primaryGoal: "First customer",
      primaryAcquisitionChannel: "Referrals, Word of Mouth",
      growthStage: "STARTUP",
      estimatedCustomerValue: 400,
      websiteStatus: "Provided, analyzed",
      campaignStatus: "1 running",
    });
  });

  it("marks the website as not provided when there's no URL", () => {
    const snapshot = buildBusinessSnapshot({ ...base, website: null, websiteCrawlSucceeded: false });
    expect(snapshot.websiteStatus).toBe("Not provided");
  });

  it("marks the website as unanalyzable when a URL exists but crawling failed", () => {
    const snapshot = buildBusinessSnapshot({ ...base, websiteCrawlSucceeded: false });
    expect(snapshot.websiteStatus).toBe("Provided, could not be analyzed");
  });
});

describe("buildWebsiteAnalysis", () => {
  const aiFields = {
    headlineClarity: "Clear and specific.",
    offerClarity: "States the service directly.",
    callsToAction: "No visible CTA button.",
    trustSignals: "No reviews shown.",
    messaging: "Direct, no jargon.",
  };

  it("returns null when there are no signals", () => {
    expect(buildWebsiteAnalysis(aiFields, null)).toBeNull();
  });

  it("returns null when there are no AI fields, even with signals", () => {
    expect(buildWebsiteAnalysis(null, signals())).toBeNull();
  });

  it("merges AI judgment with procedural facts from the signals", () => {
    const result = buildWebsiteAnalysis(aiFields, signals());
    expect(result).toEqual({
      ...aiFields,
      hasContactInfo: true,
      hasTitle: true,
      hasMetaDescription: true,
      wordCount: 250,
      imagesMissingAlt: 1,
    });
  });

  it("reports missing title/meta description honestly", () => {
    const result = buildWebsiteAnalysis(aiFields, signals({ title: null, metaDescription: null }));
    expect(result?.hasTitle).toBe(false);
    expect(result?.hasMetaDescription).toBe(false);
  });
});
