import { z } from "zod";

export const seoContentSchema = z.object({
  title: z.string(),
  metaDescription: z.string(),
  body: z.string(),
});

export type SEOContentData = z.infer<typeof seoContentSchema>;

export const seoContentJsonSchema = {
  type: "object",
  properties: {
    title: { type: "string" },
    metaDescription: { type: "string" },
    body: { type: "string" },
  },
  required: ["title", "metaDescription", "body"],
} as const;
