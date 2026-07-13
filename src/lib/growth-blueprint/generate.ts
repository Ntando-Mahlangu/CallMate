import { prisma } from "@/lib/prisma";
import { getAIProvider } from "@/lib/ai";
import { UserFacingError } from "@/lib/errors";
import { logEvent, EventType } from "@/lib/memory/log-event";
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
- The executive summary must stay under 200 words, plain English, no
  buzzwords, and cover: what the business does, its current position, its
  biggest opportunity, its biggest challenge, and the recommended focus.
- Identify exactly ONE biggest bottleneck — not several.
- Write like an experienced, direct growth consultant: concise and
  actionable, never generic filler that could apply to any business.`;

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

  return [
    lines.join("\n"),
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
        }),
      },
    ],
    schema: growthBlueprintSchema,
    jsonSchema: growthBlueprintJsonSchema,
    toolName: "growth_blueprint",
  });

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
        strengths: data.strengths,
        weaknesses: data.weaknesses,
        biggestBottleneck: data.biggestBottleneck,
        opportunities: data.opportunities,
        growthStrategy: data.growthStrategy,
        idealCustomerProfile: data.idealCustomerProfile,
        roadmap: data.roadmap,
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

  return blueprint;
}
