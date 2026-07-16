import { z } from "zod";

// Mirrors docs/outrun/05-growth-blueprint-engine.md section by section.
// Every recommendation-bearing object carries its own reasoning field —
// Article IV: never present a score or recommendation unexplained.

const impact = z.enum(["Low", "Medium", "High"]);
const confidenceLevel = z.enum(["Low", "Medium", "High"]);

const scoreCategorySchema = z.object({
  category: z.enum([
    "Lead Generation",
    "Outbound",
    "Website",
    "SEO Readiness",
    "Positioning",
    "Offer Clarity",
    "Conversion Potential",
    "Operational Readiness",
  ]),
  score: z.number().min(0).max(100),
  reason: z.string(),
  recommendation: z.string(),
  estimatedImpact: impact,
  estimatedDifficulty: impact,
});

const strengthSchema = z.object({
  title: z.string(),
  reason: z.string(),
});

const weaknessSchema = z.object({
  title: z.string(),
  whyItMatters: z.string(),
  suggestedImprovement: z.string(),
  estimatedImpact: impact,
});

const bottleneckSchema = z.object({
  title: z.string(),
  description: z.string(),
  whyItIsLimitingGrowth: z.string(),
  howFixingItChangesTheBusiness: z.string(),
});

const opportunitySchema = z.object({
  title: z.string(),
  description: z.string(),
  priority: impact,
  estimatedImpact: impact,
  estimatedEffort: impact,
  confidence: z.number().min(0).max(100),
  supportingEvidence: z.string(),
  recommendedAction: z.string(),
});

const growthStrategySchema = z.object({
  channel: z.string(),
  whyItFits: z.string(),
  expectedAdvantages: z.string(),
  potentialChallenges: z.string(),
  impact,
});

// docs/outrun/16 Article IV/VIII, CLAUDE.md non-negotiable — every AI output
// must separate observed facts from inference. The ICP is this Blueprint's
// most speculative section (it's predicting who a customer WILL be, not
// analyzing something that already exists), so each claim carries its own
// basis rather than leaving the whole profile's epistemic status to the
// single top-level confidenceNotes/overallConfidence fields. "stated"
// mirrors something the business owner actually said in onboarding;
// "inferred" is the AI extrapolating beyond that — matching the same
// stated-vs-derived split used for prospect research
// (src/lib/prospects/research-schema.ts's "observed"/"assumption").
const icpClaimBasis = z.enum(["stated", "inferred"]);
const icpClaimSchema = z.object({
  text: z.string(),
  basis: icpClaimBasis,
});

const idealCustomerProfileSchema = z.object({
  industry: z.string(),
  companySize: z.string(),
  decisionMaker: z.string(),
  location: z.string(),
  revenueRange: z.string().nullable(),
  painPoints: z.array(icpClaimSchema),
  likelyGoals: z.array(icpClaimSchema),
  buyingTriggers: z.array(icpClaimSchema),
  whyTheyWouldChooseThisBusiness: z.string(),
});

const roadmapItemSchema = z.object({
  horizon: z.enum(["Today", "This Week", "This Month", "This Quarter"]),
  action: z.string(),
  reason: z.string(),
  estimatedTime: z.string(),
  expectedImpact: impact,
});

export const growthBlueprintSchema = z.object({
  growthScore: z.number().min(0).max(100),
  executiveSummary: z.string(),
  scoreCategories: z.array(scoreCategorySchema).length(8),
  strengths: z.array(strengthSchema).min(2).max(4),
  weaknesses: z.array(weaknessSchema).min(2).max(4),
  biggestBottleneck: bottleneckSchema,
  opportunities: z.array(opportunitySchema).min(3).max(6),
  growthStrategy: z.array(growthStrategySchema).min(1).max(3),
  idealCustomerProfile: idealCustomerProfileSchema,
  roadmap: z.array(roadmapItemSchema).min(4),
  confidenceNotes: z.string(),
  overallConfidence: confidenceLevel,
});

export type GrowthBlueprintData = z.infer<typeof growthBlueprintSchema>;

// Anthropic tool input_schema (JSON Schema) mirroring the Zod shape above —
// forces the model to return exactly this structure via tool use.
export const growthBlueprintJsonSchema = {
  type: "object",
  properties: {
    growthScore: { type: "integer", minimum: 0, maximum: 100 },
    executiveSummary: { type: "string" },
    scoreCategories: {
      type: "array",
      minItems: 8,
      maxItems: 8,
      items: {
        type: "object",
        properties: {
          category: {
            type: "string",
            enum: [
              "Lead Generation",
              "Outbound",
              "Website",
              "SEO Readiness",
              "Positioning",
              "Offer Clarity",
              "Conversion Potential",
              "Operational Readiness",
            ],
          },
          score: { type: "integer", minimum: 0, maximum: 100 },
          reason: { type: "string" },
          recommendation: { type: "string" },
          estimatedImpact: { type: "string", enum: ["Low", "Medium", "High"] },
          estimatedDifficulty: { type: "string", enum: ["Low", "Medium", "High"] },
        },
        required: [
          "category",
          "score",
          "reason",
          "recommendation",
          "estimatedImpact",
          "estimatedDifficulty",
        ],
      },
    },
    strengths: {
      type: "array",
      minItems: 2,
      maxItems: 4,
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          reason: { type: "string" },
        },
        required: ["title", "reason"],
      },
    },
    weaknesses: {
      type: "array",
      minItems: 2,
      maxItems: 4,
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          whyItMatters: { type: "string" },
          suggestedImprovement: { type: "string" },
          estimatedImpact: { type: "string", enum: ["Low", "Medium", "High"] },
        },
        required: ["title", "whyItMatters", "suggestedImprovement", "estimatedImpact"],
      },
    },
    biggestBottleneck: {
      type: "object",
      properties: {
        title: { type: "string" },
        description: { type: "string" },
        whyItIsLimitingGrowth: { type: "string" },
        howFixingItChangesTheBusiness: { type: "string" },
      },
      required: [
        "title",
        "description",
        "whyItIsLimitingGrowth",
        "howFixingItChangesTheBusiness",
      ],
    },
    opportunities: {
      type: "array",
      minItems: 3,
      maxItems: 6,
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          priority: { type: "string", enum: ["Low", "Medium", "High"] },
          estimatedImpact: { type: "string", enum: ["Low", "Medium", "High"] },
          estimatedEffort: { type: "string", enum: ["Low", "Medium", "High"] },
          confidence: { type: "integer", minimum: 0, maximum: 100 },
          supportingEvidence: { type: "string" },
          recommendedAction: { type: "string" },
        },
        required: [
          "title",
          "description",
          "priority",
          "estimatedImpact",
          "estimatedEffort",
          "confidence",
          "supportingEvidence",
          "recommendedAction",
        ],
      },
    },
    growthStrategy: {
      type: "array",
      minItems: 1,
      maxItems: 3,
      items: {
        type: "object",
        properties: {
          channel: { type: "string" },
          whyItFits: { type: "string" },
          expectedAdvantages: { type: "string" },
          potentialChallenges: { type: "string" },
          impact: { type: "string", enum: ["Low", "Medium", "High"] },
        },
        required: [
          "channel",
          "whyItFits",
          "expectedAdvantages",
          "potentialChallenges",
          "impact",
        ],
      },
    },
    idealCustomerProfile: {
      type: "object",
      properties: {
        industry: { type: "string" },
        companySize: { type: "string" },
        decisionMaker: { type: "string" },
        location: { type: "string" },
        revenueRange: { type: ["string", "null"] },
        painPoints: {
          type: "array",
          items: {
            type: "object",
            properties: {
              text: { type: "string" },
              basis: {
                type: "string",
                enum: ["stated", "inferred"],
                description:
                  "'stated' if the business owner said this directly in onboarding, 'inferred' if the AI derived it beyond what was actually said",
              },
            },
            required: ["text", "basis"],
          },
        },
        likelyGoals: {
          type: "array",
          items: {
            type: "object",
            properties: {
              text: { type: "string" },
              basis: { type: "string", enum: ["stated", "inferred"] },
            },
            required: ["text", "basis"],
          },
        },
        buyingTriggers: {
          type: "array",
          items: {
            type: "object",
            properties: {
              text: { type: "string" },
              basis: { type: "string", enum: ["stated", "inferred"] },
            },
            required: ["text", "basis"],
          },
        },
        whyTheyWouldChooseThisBusiness: { type: "string" },
      },
      required: [
        "industry",
        "companySize",
        "decisionMaker",
        "location",
        "revenueRange",
        "painPoints",
        "likelyGoals",
        "buyingTriggers",
        "whyTheyWouldChooseThisBusiness",
      ],
    },
    roadmap: {
      type: "array",
      minItems: 4,
      items: {
        type: "object",
        properties: {
          horizon: {
            type: "string",
            enum: ["Today", "This Week", "This Month", "This Quarter"],
          },
          action: { type: "string" },
          reason: { type: "string" },
          estimatedTime: { type: "string" },
          expectedImpact: { type: "string", enum: ["Low", "Medium", "High"] },
        },
        required: ["horizon", "action", "reason", "estimatedTime", "expectedImpact"],
      },
    },
    confidenceNotes: { type: "string" },
    overallConfidence: { type: "string", enum: ["Low", "Medium", "High"] },
  },
  required: [
    "growthScore",
    "executiveSummary",
    "scoreCategories",
    "strengths",
    "weaknesses",
    "biggestBottleneck",
    "opportunities",
    "growthStrategy",
    "idealCustomerProfile",
    "roadmap",
    "confidenceNotes",
    "overallConfidence",
  ],
} as const;
