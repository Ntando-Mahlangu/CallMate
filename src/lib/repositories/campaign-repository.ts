import type { CampaignStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export function create(input: {
  organizationId: string;
  name: string;
  objective: string;
  strategyRationale: string;
  strategyConfidence: string;
  strategyChannel: string;
  strategyStrengths: string[];
  strategyWeaknesses: string[];
  audienceSource: string;
}) {
  return prisma.campaign.create({
    data: {
      organizationId: input.organizationId,
      name: input.name,
      objective: input.objective,
      strategyRationale: input.strategyRationale,
      strategyConfidence: input.strategyConfidence,
      strategyChannel: input.strategyChannel,
      strategyStrengths: input.strategyStrengths,
      strategyWeaknesses: input.strategyWeaknesses,
      audienceSource: input.audienceSource,
    },
  });
}

export function updateStatus(id: string, status: CampaignStatus) {
  return prisma.campaign.update({ where: { id }, data: { status } });
}

/** Most recent campaigns for the Business Brain's context builder. */
export function findRecentForOrg(organizationId: string, take: number) {
  return prisma.campaign.findMany({
    where: { organizationId },
    select: { name: true, objective: true, status: true, _count: { select: { messages: true } } },
    orderBy: { createdAt: "desc" },
    take,
  });
}

export function findManyByOrgPaginated(
  organizationId: string,
  options: { skip: number; take: number },
) {
  return prisma.campaign.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { messages: true } } },
    skip: options.skip,
    take: options.take,
  });
}

export function countForOrg(organizationId: string) {
  return prisma.campaign.count({ where: { organizationId } });
}
