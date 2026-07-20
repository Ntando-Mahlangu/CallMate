import { z } from "zod";

// docs/outrun/07 STEP 3 "AI CAMPAIGN STRATEGY" — recommendedChannel is
// constrained to the two channels this app can actually produce content
// for (email body, LinkedIn message draft). expectedStrengths/
// potentialWeaknesses back the "AI EXPLANATION" section (expected
// strengths, potential weaknesses, confidence level) without duplicating
// rationale into a second free-text paragraph.
export const campaignStrategySchema = z.object({
  rationale: z.string(),
  confidence: z.enum(["Low", "Medium", "High"]),
  recommendedChannel: z.enum(["Cold Email", "LinkedIn"]),
  expectedStrengths: z.array(z.string()).min(1).max(3),
  potentialWeaknesses: z.array(z.string()).min(1).max(3),
});

export type CampaignStrategyData = z.infer<typeof campaignStrategySchema>;

export const campaignStrategyJsonSchema = {
  type: "object",
  properties: {
    rationale: { type: "string" },
    confidence: { type: "string", enum: ["Low", "Medium", "High"] },
    recommendedChannel: { type: "string", enum: ["Cold Email", "LinkedIn"] },
    expectedStrengths: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 3 },
    potentialWeaknesses: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 3 },
  },
  required: [
    "rationale",
    "confidence",
    "recommendedChannel",
    "expectedStrengths",
    "potentialWeaknesses",
  ],
} as const;
