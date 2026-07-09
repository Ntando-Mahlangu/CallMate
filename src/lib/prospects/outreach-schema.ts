import { z } from "zod";

export const outreachSchema = z.object({
  subject: z.string(),
  body: z.string(),
  openingRationale: z.string(),
});

export type OutreachData = z.infer<typeof outreachSchema>;

export const outreachJsonSchema = {
  type: "object",
  properties: {
    subject: { type: "string" },
    body: { type: "string" },
    openingRationale: { type: "string" },
  },
  required: ["subject", "body", "openingRationale"],
} as const;
