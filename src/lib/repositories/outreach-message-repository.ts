import { prisma } from "@/lib/prisma";
import type { OutreachData } from "@/lib/prospects/outreach-schema";

export function create(input: {
  companyId: string;
  campaignId?: string;
  data: OutreachData;
  variant?: "A" | "B";
}) {
  return prisma.outreachMessage.create({
    data: {
      companyId: input.companyId,
      campaignId: input.campaignId,
      subject: input.data.subject,
      body: input.data.body,
      openingRationale: input.data.openingRationale,
      variantLabel: input.variant ?? null,
    },
  });
}

export function findByIdForOrg(organizationId: string, id: string) {
  return prisma.outreachMessage.findFirst({
    where: { id, company: { organizationId } },
    include: { company: true },
  });
}
