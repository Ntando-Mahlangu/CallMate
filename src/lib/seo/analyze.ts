import { prisma } from "@/lib/prisma";
import { getAIProvider } from "@/lib/ai";
import { UserFacingError } from "@/lib/errors";
import { logEvent, EventType } from "@/lib/memory/log-event";
import { crawlWebsite, type WebsiteSignals } from "./crawl";
import { seoAnalysisSchema, seoAnalysisJsonSchema, type SEOAnalysisData } from "./schema";

const SYSTEM_PROMPT = `You are Outrun's AI SEO Growth Consultant (docs/outrun/09). Explain SEO in
plain English for a business owner, not an SEO professional.

Rules you must follow (non-negotiable):
- Only use the crawled signals given to you (title, meta description,
  headings, word count, whether contact info/forms were found, link and
  image counts) plus the business's own description. Never guess at
  anything you weren't given (page speed, Core Web Vitals, search
  rankings, backlinks) — these require integrations this app doesn't
  have yet.
- Every category score needs a reason grounded in the actual signals.
- Executive summary: under 300 words, plain English, no jargon.
- Quick wins should be genuinely quick — things fixable in under an hour.`;

function buildUserMessage(signals: WebsiteSignals, businessDescription: string, idealCustomer: string) {
  return [
    `Business: ${businessDescription}`,
    `Ideal customer: ${idealCustomer}`,
    "",
    `Website: ${signals.url}`,
    `Title tag: ${signals.title ?? "missing"}`,
    `Meta description: ${signals.metaDescription ?? "missing"}`,
    `H1 headings: ${signals.h1s.join(" | ") || "none found"}`,
    `H2 headings: ${signals.h2s.slice(0, 10).join(" | ") || "none found"}`,
    `Word count: ${signals.wordCount}`,
    `Contact info found: ${signals.hasContactInfo ? "yes" : "no"}`,
    `Form found: ${signals.hasForm ? "yes" : "no"}`,
    `Link count: ${signals.linkCount}`,
    `Images: ${signals.imageCount} (${signals.imagesMissingAlt} missing alt text)`,
    "",
    "Produce a complete SEO analysis from this information alone.",
  ].join("\n");
}

export async function analyzeSEO(organizationId: string) {
  const organization = await prisma.organization.findUniqueOrThrow({
    where: { id: organizationId },
    include: { businessProfile: true },
  });
  if (!organization.businessProfile) {
    throw new UserFacingError("Finish Business Discovery before running an SEO analysis.");
  }
  if (!organization.website) {
    throw new UserFacingError(
      "Add your website below before running an SEO analysis.",
    );
  }

  const signals = await crawlWebsite(organization.website);

  const ai = getAIProvider();
  const data = await ai.generateObject<SEOAnalysisData>({
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: buildUserMessage(
          signals,
          organization.businessProfile.description,
          organization.businessProfile.idealCustomer,
        ),
      },
    ],
    schema: seoAnalysisSchema,
    jsonSchema: seoAnalysisJsonSchema,
    toolName: "seo_analysis",
  });

  const previous = await prisma.seoAnalysis.findFirst({
    where: { organizationId },
    orderBy: { version: "desc" },
  });

  const analysis = await prisma.seoAnalysis.create({
    data: {
      organizationId,
      version: (previous?.version ?? 0) + 1,
      healthScore: data.healthScore,
      executiveSummary: data.executiveSummary,
      categories: data.categories,
      quickWins: data.quickWins,
      keywordSuggestions: data.keywordSuggestions,
      contentIdeas: data.contentIdeas,
    },
  });

  await logEvent(
    organizationId,
    EventType.SEO_ANALYZED,
    `SEO analysis run — health score ${data.healthScore}/100.`,
  );

  return analysis;
}
