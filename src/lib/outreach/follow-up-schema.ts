import { z } from "zod";

const followUpMessageSchema = z.object({
  subject: z.string(),
  body: z.string(),
  valueAdd: z.string(),
});

// docs/outrun/07 "FOLLOW-UP SEQUENCES" — exactly three, at Day 3/7/14.
export const followUpSequenceSchema = z.object({
  dayThree: followUpMessageSchema,
  daySeven: followUpMessageSchema,
  dayFourteen: followUpMessageSchema,
});

export type FollowUpSequenceData = z.infer<typeof followUpSequenceSchema>;

const messageJsonSchema = {
  type: "object",
  properties: {
    subject: { type: "string" },
    body: { type: "string" },
    valueAdd: { type: "string" },
  },
  required: ["subject", "body", "valueAdd"],
} as const;

export const followUpSequenceJsonSchema = {
  type: "object",
  properties: {
    dayThree: messageJsonSchema,
    daySeven: messageJsonSchema,
    dayFourteen: messageJsonSchema,
  },
  required: ["dayThree", "daySeven", "dayFourteen"],
} as const;
