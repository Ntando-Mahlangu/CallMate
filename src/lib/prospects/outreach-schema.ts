import { z } from "zod";

export const outreachSchema = z.object({
  subject: z.string(),
  body: z.string(),
  openingRationale: z.string(),
  // docs/outrun/07 "LINKEDIN MESSAGE" — shorter, max 500 characters,
  // conversation-first. Generated alongside the email as a standalone
  // draft (no LinkedIn API integration exists, so it's copied manually).
  linkedinMessage: z.string(),
});

export type OutreachData = z.infer<typeof outreachSchema>;

export const outreachJsonSchema = {
  type: "object",
  properties: {
    subject: { type: "string" },
    body: { type: "string" },
    openingRationale: { type: "string" },
    linkedinMessage: { type: "string" },
  },
  required: ["subject", "body", "openingRationale", "linkedinMessage"],
} as const;
