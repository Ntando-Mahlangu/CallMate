import { UsageEventType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { UserFacingError } from "@/lib/errors";
import { checkAndRecordUsage } from "@/lib/billing/usage";
import { generateOutreach } from "@/lib/prospects/outreach";
import { generateCampaignStrategy } from "./strategy";
import { logEvent, EventType } from "@/lib/memory/log-event";
import { captureError } from "@/lib/observability";
import * as campaignRepository from "@/lib/repositories/campaign-repository";
import * as companyRepository from "@/lib/repositories/company-repository";

export async function createCampaign(
  organizationId: string,
  input: { name: string; objective: string; companyIds: string[]; abTest?: boolean },
) {
  const organization = await prisma.organization.findUniqueOrThrow({
    where: { id: organizationId },
    include: { businessProfile: true },
  });
  if (!organization.businessProfile) {
    throw new UserFacingError("Finish Business Discovery before launching a campaign.");
  }

  const companies = await companyRepository.findManyByIdsForOrgWithResearch(
    organizationId,
    input.companyIds,
  );
  if (companies.length === 0) {
    throw new UserFacingError(
      "Select at least one researched prospect to build a campaign around.",
    );
  }

  const strategy = await generateCampaignStrategy({
    objective: input.objective,
    businessDescription: organization.businessProfile.description,
    idealCustomer: organization.businessProfile.idealCustomer,
    companies: companies.map((c) => ({
      name: c.name,
      category: c.category,
      fitScore: c.fitScore,
    })),
  });

  const campaign = await campaignRepository.create({
    organizationId,
    name: input.name,
    objective: input.objective,
    strategyRationale: strategy.rationale,
    strategyConfidence: strategy.confidence,
  });

  let generatedCount = 0;
  let limitReached = false;

  // docs/outrun/07 "A/B TESTING" — split the audience roughly 50/50 across
  // two opening/CTA angles so results are comparable, rather than
  // generating one variant for everyone.
  for (const [i, company] of companies.entries()) {
    try {
      await checkAndRecordUsage(organizationId, UsageEventType.OUTREACH_GENERATION);
    } catch (error) {
      if (error instanceof UserFacingError) {
        limitReached = true;
        break;
      }
      throw error;
    }

    try {
      const variant = input.abTest ? (i % 2 === 0 ? "A" : "B") : undefined;
      await generateOutreach(company.id, organizationId, campaign.id, variant);
      generatedCount += 1;
    } catch (error) {
      captureError("campaigns.create.outreach", error, { organizationId, companyId: company.id });
    }
  }

  await campaignRepository.updateStatus(campaign.id, generatedCount > 0 ? "READY" : "DRAFT");

  await logEvent(
    organizationId,
    EventType.CAMPAIGN_CREATED,
    `Campaign "${input.name}" created with ${generatedCount} message${generatedCount === 1 ? "" : "s"}.`,
  );

  return { campaignId: campaign.id, generatedCount, requestedCount: companies.length, limitReached };
}
