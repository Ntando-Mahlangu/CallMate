import { z } from "zod";

// docs/outrun/07 "COLD CALL SCRIPT" — the six required sections.
export const callScriptSchema = z.object({
  opening: z.string(),
  discoveryQuestions: z.array(z.string()),
  painExploration: z.string(),
  valueStatement: z.string(),
  objectionHandling: z.array(
    z.object({
      objection: z.string(),
      response: z.string(),
    }),
  ),
  closing: z.string(),
});

export type CallScriptData = z.infer<typeof callScriptSchema>;

export const callScriptJsonSchema = {
  type: "object",
  properties: {
    opening: { type: "string" },
    discoveryQuestions: { type: "array", items: { type: "string" } },
    painExploration: { type: "string" },
    valueStatement: { type: "string" },
    objectionHandling: {
      type: "array",
      items: {
        type: "object",
        properties: {
          objection: { type: "string" },
          response: { type: "string" },
        },
        required: ["objection", "response"],
      },
    },
    closing: { type: "string" },
  },
  required: [
    "opening",
    "discoveryQuestions",
    "painExploration",
    "valueStatement",
    "objectionHandling",
    "closing",
  ],
} as const;
