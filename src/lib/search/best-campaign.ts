import { prisma } from "@/lib/prisma";

export type BestCampaignResult = {
  id: string;
  name: string;
  replyRatePercent: number;
  sentCount: number;
} | null;

// Same honesty bar as the AI Improvement Loop's MIN_BUCKET_SENT — a
// campaign with one or two sends can't meaningfully claim "best."
const MIN_SENT_FOR_RANKING = 3;

// docs/outrun/04 "GLOBAL SEARCH" example "Show my best campaign" — a
// real ranking off actual send/reply data, not an AI guess.
export async function findBestCampaign(organizationId: string): Promise<BestCampaignResult> {
  const campaigns = await prisma.campaign.findMany({
    where: { organizationId },
    select: {
      id: true,
      name: true,
      messages: { select: { sendStatus: true, gotReply: true } },
    },
  });

  let best: BestCampaignResult = null;
  for (const campaign of campaigns) {
    const sent = campaign.messages.filter((m) => m.sendStatus === "SENT");
    if (sent.length < MIN_SENT_FOR_RANKING) continue;

    const replies = sent.filter((m) => m.gotReply).length;
    const replyRatePercent = Math.round((replies / sent.length) * 100);

    if (!best || replyRatePercent > best.replyRatePercent) {
      best = { id: campaign.id, name: campaign.name, replyRatePercent, sentCount: sent.length };
    }
  }

  return best;
}
