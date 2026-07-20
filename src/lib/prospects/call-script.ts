import { prisma } from "@/lib/prisma";
import { getAIProvider } from "@/lib/ai";
import { UserFacingError } from "@/lib/errors";
import { logEvent, EventType } from "@/lib/memory/log-event";
import * as companyRepository from "@/lib/repositories/company-repository";
import type { CompanyResearchData } from "./research-schema";
import {
  callScriptSchema,
  callScriptJsonSchema,
  type CallScriptData,
} from "./call-script-schema";

const SYSTEM_PROMPT = `You are Outrun's AI Outreach engine (docs/outrun/07). Write ONE cold-call
script from the requesting business to one specific prospect, using only
their existing research profile.

Produce exactly these six sections:
- opening: how the caller introduces themselves and earns the first 10
  seconds, referencing a concrete research fact — never a fabricated one.
- discoveryQuestions: 3-5 open questions to confirm the prospect's
  situation before pitching.
- painExploration: how the caller reflects back the prospect's likely
  pain point and lets them confirm or correct it.
- valueStatement: a short, concrete statement of how the sender's
  business helps, with no exaggerated or unverifiable claims.
- objectionHandling: 2-4 common objections this prospect might raise,
  each paired with a calm, honest response.
- closing: a single, low-friction next step (e.g. book a short call),
  never a hard close.

The script should sound conversational, like real talking points, not a
robotic word-for-word transcript. Never claim to have observed something
that wasn't in the research, never fabricate facts, credentials, or
shared connections, and never use manipulative or high-pressure language.`;

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
    "Write the cold-call script now.",
  ].join("\n");
}

export async function generateCallScript(companyId: string, organizationId: string) {
  const company = await companyRepository.findByIdForOrg(organizationId, companyId);
  if (!company) {
    throw new UserFacingError("That prospect could not be found.");
  }
  if (!company.research) {
    throw new UserFacingError("Research this prospect before generating a call script.");
  }

  const organization = await prisma.organization.findUniqueOrThrow({
    where: { id: organizationId },
    include: { businessProfile: true },
  });
  if (!organization.businessProfile) {
    throw new UserFacingError("Finish Business Discovery before generating a call script.");
  }

  const ai = getAIProvider();
  const data = await ai.generateObject<CallScriptData>({
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
    schema: callScriptSchema,
    jsonSchema: callScriptJsonSchema,
    toolName: "call_script",
  });

  const updated = await companyRepository.updateCallScript(company.id, data);

  await logEvent(
    organizationId,
    EventType.CALL_SCRIPT_GENERATED,
    `Generated a cold-call script for ${company.name}.`,
  );

  return updated;
}
