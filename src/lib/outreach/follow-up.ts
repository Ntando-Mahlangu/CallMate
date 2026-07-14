import { prisma } from "@/lib/prisma";
import { getAIProvider } from "@/lib/ai";
import { UserFacingError } from "@/lib/errors";
import { logEvent, EventType } from "@/lib/memory/log-event";
import type { CompanyResearchData } from "@/lib/prospects/research-schema";
import {
  followUpSequenceSchema,
  followUpSequenceJsonSchema,
  type FollowUpSequenceData,
} from "./follow-up-schema";

const SYSTEM_PROMPT = `You are Outrun's AI Outreach engine (docs/outrun/07 "FOLLOW-UP SEQUENCES").
Write THREE follow-up emails to a prospect who hasn't replied to an
initial cold email yet, spaced at Day 3, Day 7, and Day 14.

Rules you must follow (non-negotiable):
- Never repeat the same message. Each follow-up must add genuinely new
  value — a new angle, a new piece of relevant information, or a fresh
  reason to respond — not just a rephrased reminder.
- Day 3 (dayThree): a brief, low-pressure nudge that adds one small new
  piece of value or context versus the original email.
- Day 7 (daySeven): a different angle entirely — e.g. a different pain
  point or opportunity from the research, not the one used in the
  original email or the Day 3 follow-up.
- Day 14 (dayFourteen): a short, respectful "last check-in" that gives
  the prospect an easy, low-friction way to say not now, without being
  pushy or guilt-tripping.
- valueAdd must explain, in one sentence, what new value this specific
  follow-up brings compared to the previous message(s) in the sequence.
- Never fabricate facts, credentials, or shared connections. Never
  claim to have observed something that wasn't in the research.
- No exaggerated claims or hard selling.`;

const DAY_OFFSETS = { dayThree: 3, daySeven: 7, dayFourteen: 14 } as const;
const SEQUENCE_STEPS = [
  { key: "dayThree" as const, step: 1 },
  { key: "daySeven" as const, step: 2 },
  { key: "dayFourteen" as const, step: 3 },
];

export async function generateFollowUpSequence(organizationId: string, initialMessageId: string) {
  const initial = await prisma.outreachMessage.findFirst({
    where: { id: initialMessageId, company: { organizationId } },
    include: { company: true, followUps: true },
  });
  if (!initial) {
    throw new UserFacingError("That message could not be found.");
  }
  if (!initial.sentAt) {
    throw new UserFacingError("Send the initial message before generating follow-ups.");
  }
  if (initial.followUps.length > 0) {
    throw new UserFacingError("This message already has a follow-up sequence.");
  }
  if (!initial.company.research) {
    throw new UserFacingError("Research this prospect before generating follow-ups.");
  }

  const organization = await prisma.organization.findUniqueOrThrow({
    where: { id: organizationId },
    include: { businessProfile: true },
  });
  if (!organization.businessProfile) {
    throw new UserFacingError("Finish Business Discovery before generating follow-ups.");
  }

  const research = initial.company.research as CompanyResearchData;
  const sentAt = initial.sentAt;

  const ai = getAIProvider();
  const data = await ai.generateObject<FollowUpSequenceData>({
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          `Prospect: ${initial.company.name}`,
          `Company summary: ${research.companySummary}`,
          `Likely pain points: ${research.likelyPainPoints.map((p) => p.point).join(" ")}`,
          `Growth opportunities: ${research.growthOpportunities.join(" ")}`,
          "",
          `Original email subject: ${initial.subject}`,
          `Original email body: ${initial.body}`,
          "",
          `The sender's business does this: ${organization.businessProfile.description}`,
          `Preferred tone: ${organization.brandVoice ?? "professional and direct"}`,
          "",
          "Write the three follow-up messages now.",
        ].join("\n"),
      },
    ],
    schema: followUpSequenceSchema,
    jsonSchema: followUpSequenceJsonSchema,
    toolName: "follow_up_sequence",
  });

  const created = [];
  for (const { key, step } of SEQUENCE_STEPS) {
    const msg = data[key];
    const scheduledFor = new Date(sentAt.getTime() + DAY_OFFSETS[key] * 24 * 60 * 60 * 1000);
    const followUp = await prisma.outreachMessage.create({
      data: {
        companyId: initial.companyId,
        campaignId: initial.campaignId,
        subject: msg.subject,
        body: msg.body,
        openingRationale: msg.valueAdd,
        followUpToId: initial.id,
        sequenceStep: step,
        scheduledFor,
      },
    });
    created.push(followUp);
  }

  await logEvent(
    organizationId,
    EventType.FOLLOW_UP_SEQUENCE_GENERATED,
    `Generated a 3-message follow-up sequence for ${initial.company.name}.`,
  );

  return created;
}
