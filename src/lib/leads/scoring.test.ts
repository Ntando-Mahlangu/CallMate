import { describe, it, expect } from "vitest";
import { scoreCompany } from "./scoring";
import type { RawCompanyResult } from "./types";
import type { GrowthBlueprintData } from "@/lib/growth-blueprint/schema";

function company(overrides: Partial<RawCompanyResult> = {}): RawCompanyResult {
  return {
    source: "google_places",
    sourceId: "1",
    name: "Test Plumbing Co",
    category: "Plumber",
    website: "https://example.com",
    phone: "555-0100",
    formattedAddress: "123 Main St, Austin, TX",
    rating: 4.5,
    reviewCount: 25,
    ...overrides,
  };
}

function icp(overrides: Partial<GrowthBlueprintData["idealCustomerProfile"]> = {}) {
  return {
    industry: "Plumbing services",
    companySize: "1-10",
    decisionMaker: "Owner",
    location: "Austin",
    revenueRange: null,
    painPoints: [],
    likelyGoals: [],
    buyingTriggers: [],
    whyTheyWouldChooseThisBusiness: "x",
    ...overrides,
  } as GrowthBlueprintData["idealCustomerProfile"];
}

describe("scoreCompany", () => {
  it("scores a strong category + location + review match highly", () => {
    const result = scoreCompany(company({ category: "Plumbing" }), icp());
    expect(result.fitScore).toBeGreaterThanOrEqual(70);
    expect(result.fitReason).toContain("aligns with your target industry");
  });

  it("scores a category that doesn't literally match the ICP wording as a looser match", () => {
    const result = scoreCompany(company({ category: "Plumber" }), icp({ industry: "Plumbing services" }));
    expect(result.fitReason).toContain("loose match");
  });

  it("never exceeds the 95 ceiling regardless of how many signals match", () => {
    const result = scoreCompany(company({ reviewCount: 500, rating: 5 }), icp());
    expect(result.fitScore).toBeLessThanOrEqual(95);
    expect(result.confidenceScore).toBeLessThanOrEqual(95);
  });

  it("scores lower and explains why when no ICP exists yet", () => {
    const result = scoreCompany(company(), null);
    expect(result.fitReason).toContain("No industry category returned");
  });

  it("gives a lower confidence score and an honest reason when there's no website", () => {
    const withWebsite = scoreCompany(company(), icp());
    const withoutWebsite = scoreCompany(company({ website: null }), icp());
    expect(withoutWebsite.confidenceReason).toContain("No website found");
    expect(withoutWebsite.confidenceScore).toBeLessThan(withWebsite.confidenceScore);
  });

  it("never fabricates a location match when the ICP location is generic", () => {
    const withNational = scoreCompany(company(), icp({ location: "National" }));
    const withSpecific = scoreCompany(company(), icp({ location: "Austin" }));
    // A specific, matching location should score at least as well as "national" (no bonus available)
    expect(withSpecific.fitScore).toBeGreaterThanOrEqual(withNational.fitScore);
  });
});
