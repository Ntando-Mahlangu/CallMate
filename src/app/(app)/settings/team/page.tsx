import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/session";
import { getCurrentOrganization, getMembershipFor } from "@/lib/org";
import { prisma } from "@/lib/prisma";
import { TeamPageClient } from "@/components/team/team-page-client";

export default async function TeamSettingsPage() {
  const session = await getCurrentSession();
  if (!session) redirect("/sign-in");

  const organization = await getCurrentOrganization(session.user.id);
  if (!organization) redirect("/sign-in");

  const membership = await getMembershipFor(session.user.id, organization.id);
  if (!membership) redirect("/sign-in");

  const [members, invitations] = await Promise.all([
    prisma.membership.findMany({
      where: { organizationId: organization.id },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.invitation.findMany({
      where: { organizationId: organization.id, status: "PENDING" },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <TeamPageClient
      currentUserId={session.user.id}
      canManage={membership.role === "OWNER" || membership.role === "ADMIN"}
      members={members}
      invitations={invitations}
    />
  );
}
