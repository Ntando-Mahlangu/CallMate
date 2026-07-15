import { prisma } from "@/lib/prisma";

export function findLatestForOrg(organizationId: string) {
  return prisma.growthBlueprint.findFirst({
    where: { organizationId },
    orderBy: { version: "desc" },
  });
}

/** Only the ICP field — used by prospect search to score fit against it. */
export function findLatestIcpForOrg(organizationId: string) {
  return prisma.growthBlueprint.findFirst({
    where: { organizationId },
    orderBy: { version: "desc" },
    select: { idealCustomerProfile: true },
  });
}
