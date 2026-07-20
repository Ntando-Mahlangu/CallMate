import { z } from "zod";

const difficulty = z.enum(["Low", "Medium", "High"]);
const confidenceLevel = z.enum(["Low", "Medium", "High"]);

export const companyResearchSchema = z.object({
  companySummary: z.string(),
  likelyPainPoints: z.array(
    z.object({
      point: z.string(),
      basis: z.enum(["observed", "assumption"]),
    }),
  ),
  whyTheyMatch: z.array(z.string()),
  growthOpportunities: z.array(z.string()),
  recommendedContactAngle: z.string(),
  suggestedDecisionMakerTitle: z.string(),
  websiteObservations: z.string().nullable(),
  socialPresenceNote: z.string(),
  estimatedOutreachDifficulty: difficulty,
  aiConfidence: confidenceLevel,
  confidenceReason: z.string(),
  suggestedNextStep: z.string(),
});

export type CompanyResearchData = z.infer<typeof companyResearchSchema>;

export const companyResearchJsonSchema = {
  type: "object",
  properties: {
    companySummary: { type: "string" },
    likelyPainPoints: {
      type: "array",
      items: {
        type: "object",
        properties: {
          point: { type: "string" },
          basis: { type: "string", enum: ["observed", "assumption"] },
        },
        required: ["point", "basis"],
      },
    },
    whyTheyMatch: { type: "array", items: { type: "string" } },
    growthOpportunities: { type: "array", items: { type: "string" } },
    recommendedContactAngle: { type: "string" },
    suggestedDecisionMakerTitle: { type: "string" },
    websiteObservations: { type: ["string", "null"] },
    socialPresenceNote: { type: "string" },
    estimatedOutreachDifficulty: { type: "string", enum: ["Low", "Medium", "High"] },
    aiConfidence: { type: "string", enum: ["Low", "Medium", "High"] },
    confidenceReason: { type: "string" },
    suggestedNextStep: { type: "string" },
  },
  required: [
    "companySummary",
    "likelyPainPoints",
    "whyTheyMatch",
    "growthOpportunities",
    "recommendedContactAngle",
    "suggestedDecisionMakerTitle",
    "websiteObservations",
    "socialPresenceNote",
    "estimatedOutreachDifficulty",
    "aiConfidence",
    "confidenceReason",
    "suggestedNextStep",
  ],
} as const;
