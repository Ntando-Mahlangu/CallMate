import type { MembershipRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { UserFacingError } from "@/lib/errors";
import { canManageCampaigns } from "@/lib/teams/permissions";
import * as campaignRepository from "@/lib/repositories/campaign-repository";

/**
 * docs/outrun/04 "each campaign card: View, Pause, Duplicate." Pausing
 * only makes sense once a campaign has actually launched (READY) — a
 * DRAFT still being built or a COMPLETED one has nothing running to
 * pause. Resuming only makes sense from PAUSED, for the same reason.
 * src/lib/outreach/send.ts is what actually stops sends once paused;
 * this just flips the switch.
 */
export async function setCampaignPaused(
  organizationId: string,
  actingRole: MembershipRole,
  campaignId: string,
  paused: boolean,
) {
  if (!canManageCampaigns(actingRole)) {
    throw new UserFacingError("Only workspace owners and admins can pause or resume campaigns.");
  }

  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, organizationId },
  });
  if (!campaign) {
    throw new UserFacingError("That campaign could not be found.");
  }

  if (paused && campaign.status !== "READY") {
    throw new UserFacingError("Only a launched campaign can be paused.");
  }
  if (!paused && campaign.status !== "PAUSED") {
    throw new UserFacingError("This campaign isn't paused.");
  }

  return campaignRepository.updateStatus(campaign.id, paused ? "PAUSED" : "READY");
}
