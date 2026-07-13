import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/session";
import { getCurrentOrganization } from "@/lib/org";
import { prisma } from "@/lib/prisma";
import { SeoPageClient } from "@/components/seo/seo-page-client";
import type { SEOAnalysisData } from "@/lib/seo/schema";

export default async function SeoPage() {
  const session = await getCurrentSession();
  if (!session) redirect("/sign-in");

  const organization = await getCurrentOrganization(session.user.id);
  if (!organization) redirect("/sign-in");
  if (!organization.businessProfile) redirect("/onboarding");

  const [analysis, contentPieces] = await Promise.all([
    prisma.seoAnalysis.findFirst({
      where: { organizationId: organization.id },
      orderBy: { version: "desc" },
    }),
    prisma.seoContentPiece.findMany({
      where: { organizationId: organization.id },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <SeoPageClient
      website={organization.website}
      analysis={
        analysis
          ? {
              healthScore: analysis.healthScore,
              executiveSummary: analysis.executiveSummary,
              categories: analysis.categories as SEOAnalysisData["categories"],
              quickWins: analysis.quickWins as SEOAnalysisData["quickWins"],
              keywordSuggestions: analysis.keywordSuggestions as SEOAnalysisData["keywordSuggestions"],
              contentIdeas: analysis.contentIdeas as SEOAnalysisData["contentIdeas"],
              version: analysis.version,
            }
          : null
      }
      contentPieces={contentPieces}
    />
  );
}
