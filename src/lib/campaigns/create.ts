import { Prisma, UsageEventType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { UserFacingError } from "@/lib/errors";
import { checkAndRecordUsage } from "@/lib/billing/usage";
import { generateOutreach } from "@/lib/prospects/outreach";
import { generateCampaignStrategy } from "./strategy";

export async function createCampaign(
  organizationId: string,
  input: { name: string; objective: string; companyIds: string[] },
) {
  const organization = await prisma.organization.findUniqueOrThrow({
    where: { id: organizationId },
    include: { businessProfile: true },
  });
  if (!organization.businessProfile) {
    throw new UserFacingError("Finish Business Discovery before launching a campaign.");
  }

  const companies = await prisma.company.findMany({
    where: {
      id: { in: input.companyIds },
      organizationId,
      research: { not: Prisma.DbNull },
    },
  });
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

  const campaign = await prisma.campaign.create({
    data: {
      organizationId,
      name: input.name,
      objective: input.objective,
      strategyRationale: strategy.rationale,
      strategyConfidence: strategy.confidence,
    },
  });

  let generatedCount = 0;
  let limitReached = false;

  for (const company of companies) {
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
      await generateOutreach(company.id, organizationId, campaign.id);
      generatedCount += 1;
    } catch (error) {
      console.error(`Outreach generation failed for company ${company.id}:`, error);
    }
  }

  await prisma.campaign.update({
    where: { id: campaign.id },
    data: { status: generatedCount > 0 ? "READY" : "DRAFT" },
  });

  return { campaignId: campaign.id, generatedCount, requestedCount: companies.length, limitReached };
}
