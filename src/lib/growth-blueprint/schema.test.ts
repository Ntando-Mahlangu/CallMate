import { describe, it, expect } from "vitest";
import { growthBlueprintSchema } from "./schema";

const CATEGORIES = [
  "Lead Generation",
  "Outbound",
  "Website",
  "SEO Readiness",
  "Positioning",
  "Offer Clarity",
  "Conversion Potential",
  "Operational Readiness",
] as const;

function validBlueprint(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    growthScore: 62,
    executiveSummary: "A plumbing company with steady referrals but no outbound engine.",
    scoreCategories: CATEGORIES.map((category) => ({
      category,
      score: 50,
      reason: "Some evidence one way or the other.",
      recommendation: "Do the obvious next thing.",
      estimatedImpact: "Medium",
      estimatedDifficulty: "Low",
    })),
    strengths: [
      { title: "Strong reviews", reason: "4.8 stars across 200 reviews." },
      { title: "Repeat customers", reason: "60% of jobs are repeat business." },
    ],
    weaknesses: [
      {
        title: "No website contact form",
        whyItMatters: "Leads have to call during business hours.",
        suggestedImprovement: "Add a contact form.",
        estimatedImpact: "Medium",
      },
      {
        title: "No outbound channel",
        whyItMatters: "Growth is capped by inbound-only demand.",
        suggestedImprovement: "Start cold email outreach.",
        estimatedImpact: "High",
      },
    ],
    biggestBottleneck: {
      title: "No outbound engine",
      description: "All growth is word-of-mouth.",
      whyItIsLimitingGrowth: "There's a ceiling on referral volume.",
      howFixingItChangesTheBusiness: "Unlocks a second growth channel.",
    },
    opportunities: [
      {
        title: "Cold email to property managers",
        description: "Property managers need reliable plumbers on retainer.",
        priority: "High",
        estimatedImpact: "High",
        estimatedEffort: "Low",
        confidence: 70,
        supportingEvidence: "The business already serves two property managers today.",
        recommendedAction: "Launch a targeted campaign.",
      },
      {
        title: "Local SEO",
        description: "Rank for 'plumber near me' searches.",
        priority: "Medium",
        estimatedImpact: "Medium",
        estimatedEffort: "Medium",
        confidence: 55,
        supportingEvidence: "The business has no Google Business Profile listed.",
        recommendedAction: "Claim and optimize the listing.",
      },
      {
        title: "Referral program",
        description: "Formalize the existing word-of-mouth pattern.",
        priority: "Low",
        estimatedImpact: "Low",
        estimatedEffort: "Low",
        confidence: 60,
        supportingEvidence: "Customers already refer friends informally.",
        recommendedAction: "Offer a referral discount.",
      },
    ],
    growthStrategy: [
      {
        channel: "Cold Email",
        whyItFits: "Low cost, targets a well-defined buyer.",
        expectedAdvantages: "Fast to start, measurable.",
        potentialChallenges: "Deliverability takes tuning.",
        impact: "High",
      },
    ],
    idealCustomerProfile: {
      industry: "Property management",
      companySize: "10-50 units under management",
      decisionMaker: "Property Manager",
      location: "Austin, TX",
      revenueRange: null,
      painPoints: [
        { text: "Struggles to find a plumber who answers after hours", basis: "stated" },
        { text: "Worried about tenant complaints piling up", basis: "inferred" },
      ],
      likelyGoals: [{ text: "Fewer emergency calls escalated to them personally", basis: "inferred" }],
      buyingTriggers: [{ text: "Just lost their current plumber", basis: "inferred" }],
      whyTheyWouldChooseThisBusiness: "Same-day response and existing property manager references.",
    },
    roadmap: [
      {
        horizon: "Today",
        action: "Add a contact form to the website.",
        reason: "Removes the biggest inbound friction point.",
        estimatedTime: "1 hour",
        expectedImpact: "Medium",
      },
      {
        horizon: "This Week",
        action: "Draft the cold email sequence.",
        reason: "Unlocks the outbound channel.",
        estimatedTime: "3 hours",
        expectedImpact: "High",
      },
      {
        horizon: "This Month",
        action: "Claim the Google Business Profile.",
        reason: "Captures existing local search demand.",
        estimatedTime: "1 hour",
        expectedImpact: "Medium",
      },
      {
        horizon: "This Quarter",
        action: "Launch the referral program.",
        reason: "Compounds the existing word-of-mouth channel.",
        estimatedTime: "1 week",
        expectedImpact: "Low",
      },
    ],
    confidenceNotes: "Based entirely on the onboarding answers; no website was provided to verify claims against.",
    overallConfidence: "Medium",
    ...overrides,
  };
}

describe("growthBlueprintSchema", () => {
  it("accepts a well-formed blueprint with tagged ICP claims", () => {
    const result = growthBlueprintSchema.safeParse(validBlueprint());
    expect(result.success).toBe(true);
  });

  it("rejects an ICP claim missing its basis tag", () => {
    const blueprint = validBlueprint();
    blueprint.idealCustomerProfile = {
      ...(blueprint.idealCustomerProfile as Record<string, unknown>),
      painPoints: [{ text: "no basis here" }],
    };
    const result = growthBlueprintSchema.safeParse(blueprint);
    expect(result.success).toBe(false);
  });

  it("rejects an ICP claim with an invalid basis value", () => {
    const blueprint = validBlueprint();
    blueprint.idealCustomerProfile = {
      ...(blueprint.idealCustomerProfile as Record<string, unknown>),
      painPoints: [{ text: "bad basis", basis: "guessed" }],
    };
    const result = growthBlueprintSchema.safeParse(blueprint);
    expect(result.success).toBe(false);
  });

  it("rejects the old flat-string-array ICP shape", () => {
    const blueprint = validBlueprint();
    blueprint.idealCustomerProfile = {
      ...(blueprint.idealCustomerProfile as Record<string, unknown>),
      painPoints: ["a plain string, not an object"],
    };
    const result = growthBlueprintSchema.safeParse(blueprint);
    expect(result.success).toBe(false);
  });
});
