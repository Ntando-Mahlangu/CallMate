import { z } from "zod";

export const campaignStrategySchema = z.object({
  rationale: z.string(),
  confidence: z.enum(["Low", "Medium", "High"]),
});

export type CampaignStrategyData = z.infer<typeof campaignStrategySchema>;

export const campaignStrategyJsonSchema = {
  type: "object",
  properties: {
    rationale: { type: "string" },
    confidence: { type: "string", enum: ["Low", "Medium", "High"] },
  },
  required: ["rationale", "confidence"],
} as const;
