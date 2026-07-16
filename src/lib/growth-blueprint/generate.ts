import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getAIProvider } from "@/lib/ai";
import { UserFacingError } from "@/lib/errors";
import { logEvent, EventType } from "@/lib/memory/log-event";
import { getPriorRecommendationOutcomes } from "@/lib/memory/recommendation-outcomes";
import { growthBlueprintTag, orgProfileTag } from "@/lib/cache-tags";
import { crawlWebsite, type WebsiteSignals } from "@/lib/seo/crawl";
import { captureError } from "@/lib/observability";
import { buildBusinessSnapshot, buildWebsiteAnalysis } from "./snapshot";
import {
  growthBlueprintSchema,
  growthBlueprintJsonSchema,
  type GrowthBlueprintData,
} from "./schema";

const SYSTEM_PROMPT = `You are Outrun's Growth Blueprint engine — an AI growth consultant, not a
generic business-advice chatbot. You are analyzing one specific business
from the onboarding answers and (optionally) website notes given to you.

Rules you must follow (non-negotiable):
- Never invent facts about the business, its market, or its competitors.
  Only reason from what was given to you.
- Every score, strength, weakness, and opportunity must include the
  reasoning behind it — never output an unexplained number or claim.
- Clearly separate observed facts from AI inference. If information is
  missing or thin, say so in confidenceNotes and lower overallConfidence
  accordingly rather than papering over the gap.
- For idealCustomerProfile's painPoints, likelyGoals, and buyingTriggers:
  mark each one "stated" only if the business owner said it directly (in
  the ideal customer description or elsewhere in the onboarding answers),
  and "inferred" if you're extrapolating from what they said. Most items
  here will honestly be "inferred" — that's expected, not a failure.
- The executive summary must stay under 200 words, plain English, no
  buzzwords, and cover: what the business does, its current position, its
  biggest opportunity, its biggest challenge, and the recommended focus.
- Identify exactly ONE biggest bottleneck — not several.
- Write like an experienced, direct growth consultant: concise and
  actionable, never generic filler that could apply to any business.
- If prior recommendation outcomes are provided, treat them as real
  history: don't suggest an action that was already dismissed or rated
  Not Helpful, and acknowledge genuine completed progress where it's
  relevant to the current bottleneck or opportunities. If no prior
  outcomes are provided, this is the business's first Blueprint —
  proceed without referencing history that doesn't exist.
- For businessSnapshot: only industry and businessModel are yours to
  fill in — every other Business Snapshot field is already a known fact
  supplied separately. Infer industry and businessModel directly from
  the business description; don't invent details beyond it.
- For websiteAnalysis: only fill this in when real website signals
  (title, headings, meta description, word count, form/contact-info
  presence) are given to you below. If none are given, set it to null —
  never guess at a website you weren't shown, and never comment on page
  speed or anything else you weren't given a signal for.`;

function buildUserMessage(input: {
  organizationName: string;
  website: string | null;
  description: string;
  idealCustomer: string;
  sellingLocations: string[];
  acquisitionChannels: string[];
  growthChallenge: string;
  avgCustomerValue: number | null;
  growthStage: string | null;
  mainGoal: string;
  competitors: string[];
  priorRecommendationOutcomes: string | null;
  websiteSignals: WebsiteSignals | null;
}) {
  const lines = [
    `Business name: ${input.organizationName}`,
    `Website: ${input.website ?? "not provided"}`,
    `What the business does: ${input.description}`,
    `Ideal customer: ${input.idealCustomer}`,
    `Where they sell: ${input.sellingLocations.join(", ") || "not specified"}`,
    `How customers currently find them: ${
      input.acquisitionChannels.join(", ") || "not specified"
    }`,
    `Biggest growth challenge (self-reported): ${input.growthChallenge}`,
    `Average customer value: ${
      input.avgCustomerValue != null ? `$${input.avgCustomerValue}` : "not provided"
    }`,
    `Business stage: ${input.growthStage ?? "not specified"}`,
    `Main goal: ${input.mainGoal}`,
    `Known competitors: ${input.competitors.join(", ") || "none provided"}`,
  ];

  const websiteSection = input.websiteSignals
    ? [
        `Page title: ${input.websiteSignals.title ?? "none found"}`,
        `Meta description: ${input.websiteSignals.metaDescription ?? "none found"}`,
        `H1 headings: ${input.websiteSignals.h1s.join(" | ") || "none found"}`,
        `H2 headings: ${input.websiteSignals.h2s.join(" | ") || "none found"}`,
        `Word count: ${input.websiteSignals.wordCount}`,
        `Has a form on the page: ${input.websiteSignals.hasForm ? "yes" : "no"}`,
        `Has contact info (mailto/tel link or the word 'contact'): ${
          input.websiteSignals.hasContactInfo ? "yes" : "no"
        }`,
      ].join("\n")
    : null;

  return [
    lines.join("\n"),
    "",
    input.priorRecommendationOutcomes
      ? `What happened after previous Blueprints: ${input.priorRecommendationOutcomes}`
      : "This is this business's first Growth Blueprint — there is no recommendation history yet.",
    "",
    websiteSection
      ? `Website signals actually crawled from the site above:\n${websiteSection}`
      : "No website could be crawled — set websiteAnalysis to null.",
    "",
    "Produce a complete Growth Blueprint from this information alone.",
  ].join("\n");
}

export async function generateGrowthBlueprint(organizationId: string) {
  const organization = await prisma.organization.findUniqueOrThrow({
    where: { id: organizationId },
    include: { businessProfile: true },
  });

  const profile = organization.businessProfile;
  if (!profile) {
    throw new UserFacingError(
      "Cannot generate a Growth Blueprint before Business Discovery is complete.",
    );
  }

  const ai = getAIProvider();
  const priorRecommendationOutcomes = await getPriorRecommendationOutcomes(organizationId);

  // "Website Analysis (if available)" (docs/outrun/05) — genuinely optional:
  // crawl failures (unreachable site, blocked, invalid URL) just mean the
  // section doesn't exist this time, not a hard failure of the Blueprint.
  let websiteSignals: WebsiteSignals | null = null;
  if (organization.website) {
    try {
      websiteSignals = await crawlWebsite(organization.website);
    } catch (error) {
      captureError("growth-blueprint.website-crawl", error, { organizationId });
    }
  }

  const [campaignStatusRows] = await Promise.all([
    prisma.campaign.groupBy({
      by: ["status"],
      where: { organizationId },
      _count: { _all: true },
    }),
  ]);
  const campaignStatusCounts = {
    ready: campaignStatusRows.find((r) => r.status === "READY")?._count._all ?? 0,
    draft: campaignStatusRows.find((r) => r.status === "DRAFT")?._count._all ?? 0,
    paused: campaignStatusRows.find((r) => r.status === "PAUSED")?._count._all ?? 0,
    completed: campaignStatusRows.find((r) => r.status === "COMPLETED")?._count._all ?? 0,
  };

  const data = await ai.generateObject<GrowthBlueprintData>({
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: buildUserMessage({
          organizationName: organization.name,
          website: organization.website,
          description: profile.description,
          idealCustomer: profile.idealCustomer,
          sellingLocations: profile.sellingLocations,
          acquisitionChannels: profile.acquisitionChannels,
          growthChallenge: profile.growthChallenge,
          avgCustomerValue: profile.avgCustomerValue,
          growthStage: organization.growthStage,
          mainGoal: profile.mainGoal,
          competitors: profile.competitors,
          priorRecommendationOutcomes,
          websiteSignals,
        }),
      },
    ],
    schema: growthBlueprintSchema,
    jsonSchema: growthBlueprintJsonSchema,
    toolName: "growth_blueprint",
  });

  const businessSnapshot = buildBusinessSnapshot({
    aiFields: data.businessSnapshot,
    sellingLocations: profile.sellingLocations,
    idealCustomer: profile.idealCustomer,
    mainGoal: profile.mainGoal,
    acquisitionChannels: profile.acquisitionChannels,
    growthStage: organization.growthStage,
    avgCustomerValue: profile.avgCustomerValue,
    website: organization.website,
    websiteCrawlSucceeded: websiteSignals !== null,
    campaignStatusCounts,
  });
  const websiteAnalysis = buildWebsiteAnalysis(data.websiteAnalysis, websiteSignals);

  const previous = await prisma.growthBlueprint.findFirst({
    where: { organizationId },
    orderBy: { version: "desc" },
  });
  const nextVersion = (previous?.version ?? 0) + 1;

  const [blueprint] = await prisma.$transaction([
    prisma.growthBlueprint.create({
      data: {
        organizationId,
        version: nextVersion,
        growthScore: data.growthScore,
        executiveSummary: data.executiveSummary,
        businessSnapshot,
        strengths: data.strengths,
        weaknesses: data.weaknesses,
        biggestBottleneck: data.biggestBottleneck,
        opportunities: data.opportunities,
        growthStrategy: data.growthStrategy,
        idealCustomerProfile: data.idealCustomerProfile,
        roadmap: data.roadmap,
        websiteAnalysis: websiteAnalysis ?? undefined,
        scoreCategories: data.scoreCategories,
        confidenceNotes: `${data.overallConfidence} confidence — ${data.confidenceNotes}`,
      },
    }),
    prisma.organization.update({
      where: { id: organizationId },
      data: { growthScore: data.growthScore },
    }),
  ]);

  await logEvent(
    organizationId,
    EventType.BLUEPRINT_GENERATED,
    `Growth Blueprint v${nextVersion} generated — score ${data.growthScore}/100.`,
  );

  revalidateTag(growthBlueprintTag(organizationId), "max");
  revalidateTag(orgProfileTag(organizationId), "max"); // Organization.growthScore also changed

  return blueprint;
}
