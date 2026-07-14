import { UsageEventType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { UserFacingError } from "@/lib/errors";
import { checkAndRecordUsage } from "@/lib/billing/usage";
import { generateCallScript } from "@/lib/prospects/call-script";
import { captureError } from "@/lib/observability";

/**
 * Generates a cold-call script (docs/outrun/07) for every unique company in
 * this campaign that doesn't already have one cached, so the campaign's
 * "export call scripts" action has something to export. Stops early if the
 * plan's usage allotment runs out partway through, same as campaign
 * creation's batch outreach generation.
 */
export async function generateCallScriptsForCampaign(campaignId: string, organizationId: string) {
  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, organizationId },
    include: { messages: { include: { company: true } } },
  });
  if (!campaign) {
    throw new UserFacingError("That campaign could not be found.");
  }

  const companies = Array.from(
    new Map(campaign.messages.map((m) => [m.company.id, m.company])).values(),
  ).filter((c) => c.research && !c.callScript);

  let generatedCount = 0;
  let limitReached = false;

  for (const company of companies) {
    try {
      await checkAndRecordUsage(organizationId, UsageEventType.CALL_SCRIPT_GENERATION);
    } catch (error) {
      if (error instanceof UserFacingError) {
        limitReached = true;
        break;
      }
      throw error;
    }

    try {
      await generateCallScript(company.id, organizationId);
      generatedCount += 1;
    } catch (error) {
      captureError("campaigns.call-scripts", error, { organizationId, companyId: company.id });
    }
  }

  return { generatedCount, requestedCount: companies.length, limitReached };
}
