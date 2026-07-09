import { prisma } from "@/lib/prisma";

// V1 assumption: one workspace per user (docs/outrun/03 onboarding flow).
// Multi-workspace switching is future scope (docs/outrun/14 "MULTIPLE WORKSPACES").
export async function getCurrentOrganization(userId: string) {
  const membership = await prisma.membership.findFirst({
    where: { userId },
    include: { organization: { include: { businessProfile: true } } },
    orderBy: { createdAt: "asc" },
  });

  return membership?.organization ?? null;
}
