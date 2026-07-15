import { z } from "zod";
import { getAIProvider, isAIConfigured } from "@/lib/ai";
import type { RawCompanyResult } from "./types";

const parsedQuerySchema = z.object({
  placesQuery: z.string(),
  postFilters: z.object({
    requireWebsite: z.boolean().nullable(),
    requireNoWebsite: z.boolean().nullable(),
    minRating: z.number().min(0).max(5).nullable(),
    minReviewCount: z.number().int().min(0).nullable(),
  }),
  unsupportedIntents: z.array(z.string()),
});

export type ParsedSearchQuery = z.infer<typeof parsedQuerySchema>;

const parsedQueryJsonSchema = {
  type: "object",
  properties: {
    placesQuery: { type: "string" },
    postFilters: {
      type: "object",
      properties: {
        requireWebsite: { type: ["boolean", "null"] },
        requireNoWebsite: { type: ["boolean", "null"] },
        minRating: { type: ["number", "null"], minimum: 0, maximum: 5 },
        minReviewCount: { type: ["integer", "null"], minimum: 0 },
      },
      required: ["requireWebsite", "requireNoWebsite", "minRating", "minReviewCount"],
    },
    unsupportedIntents: { type: "array", items: { type: "string" } },
  },
  required: ["placesQuery", "postFilters", "unsupportedIntents"],
};

// docs/outrun/06 "GLOBAL SEARCH" — "The AI should interpret intent
// rather than relying on exact keywords." Google Places' own Text
// Search already handles plain industry+location phrasing well, but it
// has no concept of qualifiers like "that recently hired staff" or
// "using HubSpot" — passed through verbatim, those words just pollute
// the text match. This step splits a free-text query into:
//   1. placesQuery — a clean industry+location phrase for Places
//   2. postFilters — qualifiers Outrun can actually verify from data
//      Places itself returns (website presence, rating, review count)
//   3. unsupportedIntents — everything else mentioned (funding, hiring,
//      tech stack, "weak SEO" beyond having no site at all) that gets
//      surfaced to the user honestly instead of silently dropped or,
//      worse, faked as a filter Outrun can't actually check.
const SYSTEM_PROMPT = `You turn a plain-English prospecting request into a structured search for a business directory (Google Places).

Places can only search by business name/type/category and location text, and its results only carry: name, category, website (present or not), phone, address, star rating, review count. It has no data on funding, hiring activity, technology stack, revenue, employee count, or website quality beyond "has a site or doesn't."

Rules:
- placesQuery: a short, clean phrase combining the industry/business type and location — the part Places can actually search on. Drop qualifiers Places can't use.
- postFilters: only set a field if the request clearly asked for it AND it maps to a real Places field:
  - requireNoWebsite: true if they asked for businesses without a website / with no online presence
  - requireWebsite: true if they asked for businesses that do have a website
  - minRating / minReviewCount: only if they gave a concrete quality/popularity bar
  Leave any field null if not clearly requested. Never guess a number that wasn't implied.
- unsupportedIntents: list every qualifier from the request that Places cannot verify (e.g. "raised funding", "recently hired staff", "uses HubSpot", "weak SEO", "growing fast") in plain English, exactly as the kind of claim it represents. If there are none, return an empty array. Never fold these into placesQuery or postFilters — never invent a way to "check" something Places can't tell you.`;

export async function parseSearchQuery(query: string): Promise<ParsedSearchQuery> {
  if (!isAIConfigured()) {
    // Honest degradation: without an AI provider, fall back to exactly
    // what the user typed — the same behavior this feature had before
    // this parsing step existed — rather than a half-working parse.
    return { placesQuery: query, postFilters: emptyFilters(), unsupportedIntents: [] };
  }

  try {
    const ai = getAIProvider();
    return await ai.generateObject<ParsedSearchQuery>({
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: query }],
      schema: parsedQuerySchema,
      jsonSchema: parsedQueryJsonSchema,
      toolName: "structure_search_query",
    });
  } catch {
    // A parsing failure shouldn't block the search itself — fall back
    // to the raw query, same as the unconfigured case above.
    return { placesQuery: query, postFilters: emptyFilters(), unsupportedIntents: [] };
  }
}

function emptyFilters(): ParsedSearchQuery["postFilters"] {
  return {
    requireWebsite: null,
    requireNoWebsite: null,
    minRating: null,
    minReviewCount: null,
  };
}

/** Pure filter application — kept separate from parseSearchQuery so it's
 * testable without an AI call. */
export function applyPostFilters(
  results: RawCompanyResult[],
  filters: ParsedSearchQuery["postFilters"],
): RawCompanyResult[] {
  return results.filter((r) => {
    if (filters.requireWebsite && !r.website) return false;
    if (filters.requireNoWebsite && r.website) return false;
    if (filters.minRating != null && (r.rating ?? 0) < filters.minRating) return false;
    if (filters.minReviewCount != null && (r.reviewCount ?? 0) < filters.minReviewCount) {
      return false;
    }
    return true;
  });
}
