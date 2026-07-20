import { cookies } from "next/headers";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { orgProfileTag } from "@/lib/cache-tags";

// A user can belong to more than one workspace once they've been invited to
// a team (docs/outrun/14 "MULTIPLE WORKSPACES"). The active one is
// remembered in this cookie by the workspace switcher
// (src/app/api/workspace/switch/route.ts); falls back to the oldest
// membership so single-workspace users never need it set.
export const ACTIVE_ORG_COOKIE = "outrun_active_org";

// docs/outrun/12/15 "Soft Delete Support"/"Data deletion" — a soft-deleted
// organization (src/lib/teams/delete-organization.ts) must never resolve
// here, since this is the single function nearly every page/route calls
// to get "the current organization." That makes this the one place a
// deletion actually needs to take effect, rather than every tenant-scoped
// query across the app needing its own deletedAt check.
function fetchOrganizationWithProfile(organizationId: string) {
  return prisma.organization.findFirst({
    where: { id: organizationId, deletedAt: null },
    include: { businessProfile: true },
  });
}

type OrganizationWithProfile = Awaited<ReturnType<typeof fetchOrganizationWithProfile>>;

// unstable_cache round-trips its return value through JSON, which turns
// Date fields into strings — revive them so callers get real Date
// instances back, exactly like an uncached Prisma call would return.
function reviveOrganizationDates(org: OrganizationWithProfile): OrganizationWithProfile {
  if (!org) return org;
  return {
    ...org,
    createdAt: new Date(org.createdAt),
    updatedAt: new Date(org.updatedAt),
    deletedAt: org.deletedAt ? new Date(org.deletedAt) : org.deletedAt,
    businessProfile: org.businessProfile && {
      ...org.businessProfile,
      createdAt: new Date(org.businessProfile.createdAt),
      updatedAt: new Date(org.businessProfile.updatedAt),
    },
  };
}

// docs/outrun/12 "CACHING" — getCurrentOrganization is called on nearly
// every authenticated request in the app, but the Organization +
// BusinessProfile it returns only changes on a handful of explicit writes
// (onboarding, blueprint generation, billing webhooks, SEO website save).
// Caching just this fetch — not the membership/cookie resolution, which
// depends on per-request state — avoids re-querying Postgres for the same
// row on every page load. The 5-minute revalidate is a safety net; the
// real invalidation is the revalidateTag() calls next to each write.
async function getCachedOrganizationWithProfile(organizationId: string) {
  const organization = await unstable_cache(
    () => fetchOrganizationWithProfile(organizationId),
    ["organization-with-profile", organizationId],
    { tags: [orgProfileTag(organizationId)], revalidate: 300 },
  )();
  return reviveOrganizationDates(organization);
}

export async function getActiveMembership(userId: string) {
  const memberships = await prisma.membership.findMany({
    where: { userId },
    select: { id: true, role: true, organizationId: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
  if (memberships.length === 0) return null;

  const activeOrgId = (await cookies()).get(ACTIVE_ORG_COOKIE)?.value;
  const active = activeOrgId
    ? memberships.find((m) => m.organizationId === activeOrgId)
    : undefined;
  // The preferred membership (active cookie, else oldest) might point at a
  // workspace that's since been soft-deleted — fall through the rest of
  // this user's memberships in order rather than treating them as
  // workspace-less when a live one still exists.
  const orderedCandidates = active ? [active, ...memberships.filter((m) => m !== active)] : memberships;

  for (const membership of orderedCandidates) {
    const organization = await getCachedOrganizationWithProfile(membership.organizationId);
    if (organization) return { ...membership, organization };
  }
  return null;
}

export async function getCurrentOrganization(userId: string) {
  const membership = await getActiveMembership(userId);
  return membership?.organization ?? null;
}

export async function getUserMemberships(userId: string) {
  const memberships = await prisma.membership.findMany({
    where: { userId },
    include: { organization: { select: { id: true, name: true, deletedAt: true } } },
    orderBy: { createdAt: "asc" },
  });
  // Never list a soft-deleted workspace in the switcher (src/components/team/workspace-switcher.tsx).
  return memberships.filter((m) => !m.organization.deletedAt);
}

export async function getMembershipFor(userId: string, organizationId: string) {
  return prisma.membership.findUnique({
    where: { userId_organizationId: { userId, organizationId } },
  });
}
