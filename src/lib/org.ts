import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

// A user can belong to more than one workspace once they've been invited to
// a team (docs/outrun/14 "MULTIPLE WORKSPACES"). The active one is
// remembered in this cookie by the workspace switcher
// (src/app/api/workspace/switch/route.ts); falls back to the oldest
// membership so single-workspace users never need it set.
export const ACTIVE_ORG_COOKIE = "outrun_active_org";

export async function getActiveMembership(userId: string) {
  const memberships = await prisma.membership.findMany({
    where: { userId },
    include: { organization: { include: { businessProfile: true } } },
    orderBy: { createdAt: "asc" },
  });
  if (memberships.length === 0) return null;

  const activeOrgId = (await cookies()).get(ACTIVE_ORG_COOKIE)?.value;
  const active = activeOrgId
    ? memberships.find((m) => m.organizationId === activeOrgId)
    : undefined;

  return active ?? memberships[0];
}

export async function getCurrentOrganization(userId: string) {
  const membership = await getActiveMembership(userId);
  return membership?.organization ?? null;
}

export async function getUserMemberships(userId: string) {
  return prisma.membership.findMany({
    where: { userId },
    include: { organization: { select: { id: true, name: true } } },
    orderBy: { createdAt: "asc" },
  });
}

export async function getMembershipFor(userId: string, organizationId: string) {
  return prisma.membership.findUnique({
    where: { userId_organizationId: { userId, organizationId } },
  });
}
