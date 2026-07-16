import { prisma } from "@/lib/prisma";
import type { SEOAnalysisData } from "./schema";

export type SeoMemory = {
  priorKeywords: string[];
  draftedContentKeywords: string[];
};

/**
 * docs/outrun/09 "SEO MEMORY" — "Remember: Target keywords, Published
 * content... Future recommendations should avoid duplication." Pulls real,
 * already-persisted history: every keyword this org's past analyses have
 * already suggested, and every target keyword a content piece has already
 * been drafted for (the strongest "don't repeat this" signal, since it's
 * not just a suggestion — real content already exists for it).
 */
export async function getSeoMemory(organizationId: string): Promise<SeoMemory> {
  const [pastAnalyses, draftedContent] = await Promise.all([
    prisma.seoAnalysis.findMany({
      where: { organizationId },
      select: { keywordSuggestions: true },
    }),
    prisma.seoContentPiece.findMany({
      where: { organizationId },
      select: { targetKeyword: true },
    }),
  ]);

  const priorKeywords = Array.from(
    new Set(
      pastAnalyses.flatMap((row) =>
        (row.keywordSuggestions as SEOAnalysisData["keywordSuggestions"]).map((k) => k.keyword),
      ),
    ),
  );

  const draftedContentKeywords = Array.from(
    new Set(draftedContent.map((piece) => piece.targetKeyword)),
  );

  return { priorKeywords, draftedContentKeywords };
}
