import { prisma } from "@/lib/prisma";
import { getAIProvider } from "@/lib/ai";
import { UserFacingError } from "@/lib/errors";
import type { CompanyResearchData } from "./research-schema";
import { outreachSchema, outreachJsonSchema, type OutreachData } from "./outreach-schema";

const SYSTEM_PROMPT = `You are Outrun's AI Outreach engine (docs/outrun/07). Write ONE cold email
from the requesting business to one specific prospect, using only their
existing research profile.

Rules you must follow (non-negotiable):
- 150-200 words for the body.
- Subject line: concise, no clickbait, no spam trigger words.
- Never claim to have observed something that wasn't in the research
  (e.g. never say "I noticed your website..." if no website was found).
- Never fabricate facts, credentials, or shared connections.
- No exaggerated claims or hard selling — this should read like a
  thoughtful note a real person would send, not a mass blast.
- End with a single, low-friction call to action.
- Explain, in openingRationale, why you chose that specific opening line
  — referencing the concrete research fact it is based on.`;

function buildUserMessage(input: {
  companyName: string;
  research: CompanyResearchData;
  requestingBusinessDescription: string;
  brandVoice: string | null;
}) {
  return [
    `Prospect: ${input.companyName}`,
    `Company summary: ${input.research.companySummary}`,
    `Why they match: ${input.research.whyTheyMatch.join(" ")}`,
    `Likely pain points: ${input.research.likelyPainPoints
      .map((p) => `${p.point} (${p.basis})`)
      .join(" ")}`,
    `Recommended contact angle: ${input.research.recommendedContactAngle}`,
    `Suggested decision maker title: ${input.research.suggestedDecisionMakerTitle}`,
    "",
    `The sender's business does this: ${input.requestingBusinessDescription}`,
    `Preferred tone: ${input.brandVoice ?? "professional and direct"}`,
    "",
    "Write the email now.",
  ].join("\n");
}

export async function generateOutreach(
  companyId: string,
  organizationId: string,
  campaignId?: string,
) {
  const company = await prisma.company.findFirst({
    where: { id: companyId, organizationId },
  });
  if (!company) {
    throw new UserFacingError("That prospect could not be found.");
  }
  if (!company.research) {
    throw new UserFacingError("Research this prospect before generating outreach.");
  }

  const organization = await prisma.organization.findUniqueOrThrow({
    where: { id: organizationId },
    include: { businessProfile: true },
  });
  if (!organization.businessProfile) {
    throw new UserFacingError("Finish Business Discovery before generating outreach.");
  }

  const ai = getAIProvider();
  const data = await ai.generateObject<OutreachData>({
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: buildUserMessage({
          companyName: company.name,
          research: company.research as CompanyResearchData,
          requestingBusinessDescription: organization.businessProfile.description,
          brandVoice: organization.brandVoice,
        }),
      },
    ],
    schema: outreachSchema,
    jsonSchema: outreachJsonSchema,
    toolName: "outreach_message",
  });

  return prisma.outreachMessage.create({
    data: {
      companyId: company.id,
      campaignId,
      subject: data.subject,
      body: data.body,
      openingRationale: data.openingRationale,
    },
  });
}
