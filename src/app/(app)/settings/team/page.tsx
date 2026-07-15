import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/session";
import { getCurrentOrganization, getMembershipFor } from "@/lib/org";
import { prisma } from "@/lib/prisma";
import { TeamPageClient } from "@/components/team/team-page-client";
import { AuditLogSection } from "@/components/team/audit-log-section";

const AUDIT_LOG_LIMIT = 50;

export default async function TeamSettingsPage() {
  const session = await getCurrentSession();
  if (!session) redirect("/sign-in");

  const organization = await getCurrentOrganization(session.user.id);
  if (!organization) redirect("/sign-in");

  const membership = await getMembershipFor(session.user.id, organization.id);
  if (!membership) redirect("/sign-in");

  const canManage = membership.role === "OWNER" || membership.role === "ADMIN";

  const [members, invitations, auditLogEntries] = await Promise.all([
    prisma.membership.findMany({
      where: { organizationId: organization.id },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.invitation.findMany({
      where: { organizationId: organization.id, status: "PENDING" },
      orderBy: { createdAt: "desc" },
    }),
    canManage
      ? prisma.auditLog.findMany({
          where: { organizationId: organization.id },
          orderBy: { createdAt: "desc" },
          take: AUDIT_LOG_LIMIT,
        })
      : Promise.resolve([]),
  ]);

  const actorNames = new Map(members.map((m) => [m.userId, m.user.name]));

  return (
    <div className="space-y-8">
      <TeamPageClient
        currentUserId={session.user.id}
        canManage={canManage}
        members={members}
        invitations={invitations}
      />
      {canManage && <AuditLogSection entries={auditLogEntries} actorNames={actorNames} />}
    </div>
  );
}
