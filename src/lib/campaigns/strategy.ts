import { getAIProvider } from "@/lib/ai";
import {
  campaignStrategySchema,
  campaignStrategyJsonSchema,
  type CampaignStrategyData,
} from "./strategy-schema";

const SYSTEM_PROMPT = `You are Outrun's Campaign Strategy engine (docs/outrun/07 "AI CAMPAIGN
STRATEGY"). Before any outreach is written, explain in plain English why
this specific audience fits this specific objective for this specific
business — referencing the actual company count and fit scores given to
you, never generic campaign advice.

Rules:
- One short paragraph, 2-4 sentences.
- Base confidence on how well the audience matches the business's ideal
  customer profile and how much research is available — not on
  optimism. If the audience is small or the fit is mixed, say so and use
  Low or Medium confidence.`;

export async function generateCampaignStrategy(input: {
  objective: string;
  businessDescription: string;
  idealCustomer: string;
  companies: { name: string; category: string | null; fitScore: number | null }[];
}): Promise<CampaignStrategyData> {
  const ai = getAIProvider();

  const avgFit =
    input.companies.reduce((sum, c) => sum + (c.fitScore ?? 0), 0) /
    Math.max(1, input.companies.length);

  const message = [
    `Campaign objective: ${input.objective}`,
    `Business: ${input.businessDescription}`,
    `Ideal customer: ${input.idealCustomer}`,
    `Audience size: ${input.companies.length} companies`,
    `Average fit score: ${Math.round(avgFit)}/100`,
    `Companies: ${input.companies
      .map((c) => `${c.name} (${c.category ?? "uncategorized"}, fit ${c.fitScore ?? "n/a"})`)
      .join("; ")}`,
  ].join("\n");

  return ai.generateObject<CampaignStrategyData>({
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: message }],
    schema: campaignStrategySchema,
    jsonSchema: campaignStrategyJsonSchema,
    toolName: "campaign_strategy",
  });
}
