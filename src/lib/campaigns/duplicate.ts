import type { MembershipRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { UserFacingError } from "@/lib/errors";
import { canManageCampaigns } from "@/lib/teams/permissions";
import { campaignStrategySchema } from "./strategy-schema";
import type { CampaignGenerationPayload } from "@/lib/jobs/queue";

/**
 * docs/outrun/04 "each campaign card: View, Pause, Duplicate." Builds the
 * same payload shape POST /api/campaigns enqueues, so a duplicate goes
 * through the identical real generation pipeline (fresh outreach for the
 * same audience) rather than shallow-copying settings with no usable
 * messages. Reuses the original's already-reviewed strategy when it's
 * still valid — createCampaign falls back to generating a new one
 * otherwise, exactly as it does for a first-time launch with no strategy.
 */
export async function buildDuplicatePayload(
  organizationId: string,
  actingRole: MembershipRole,
  campaignId: string,
): Promise<CampaignGenerationPayload> {
  if (!canManageCampaigns(actingRole)) {
    throw new UserFacingError("Only workspace owners and admins can duplicate campaigns.");
  }

  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, organizationId },
    include: { messages: { select: { companyId: true, variantLabel: true } } },
  });
  if (!campaign) {
    throw new UserFacingError("That campaign could not be found.");
  }

  const companyIds = Array.from(new Set(campaign.messages.map((m) => m.companyId)));
  if (companyIds.length === 0) {
    throw new UserFacingError("This campaign has no prospects to duplicate.");
  }

  const strategyParsed = campaignStrategySchema.safeParse({
    rationale: campaign.strategyRationale,
    confidence: campaign.strategyConfidence,
    recommendedChannel: campaign.strategyChannel,
    expectedStrengths: campaign.strategyStrengths,
    potentialWeaknesses: campaign.strategyWeaknesses,
  });

  return {
    name: `${campaign.name} (Copy)`,
    objective: campaign.objective,
    companyIds,
    abTest: campaign.messages.some((m) => m.variantLabel !== null),
    strategy: strategyParsed.success ? strategyParsed.data : undefined,
    audienceSource: campaign.audienceSource ?? "Manual Selection",
  };
}
