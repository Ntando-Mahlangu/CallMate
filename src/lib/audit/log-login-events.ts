import { prisma } from "@/lib/prisma";
import { logAuditEvent, AuditAction } from "@/lib/audit/log-audit-event";

/**
 * docs/outrun/12 "AUDIT LOG" / docs/outrun/15 "AUTHENTICATION SECURITY" both
 * list logins as a required audit category. The audit log is org-scoped,
 * but a login isn't — a user can belong to more than one workspace (team
 * memberships), so a sign-in is recorded against every workspace they
 * belong to rather than picking one arbitrarily.
 */
export async function logLoginForUser(userId: string) {
  const memberships = await prisma.membership.findMany({
    where: { userId },
    select: { organizationId: true },
  });
  for (const { organizationId } of memberships) {
    await logAuditEvent(organizationId, AuditAction.LOGIN, { actorUserId: userId });
  }
}

/**
 * Only meaningful for a real, existing account — an attempt against an
 * email with no account has no workspace to attribute it to, and is also
 * the less security-relevant case (nothing of the org's was actually at
 * risk). Looked up by email rather than passed a userId since a failed
 * credential check never resolves to an authenticated user.
 */
export async function logFailedLoginForEmail(email: string) {
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (!user) return;
  const memberships = await prisma.membership.findMany({
    where: { userId: user.id },
    select: { organizationId: true },
  });
  for (const { organizationId } of memberships) {
    await logAuditEvent(organizationId, AuditAction.LOGIN_FAILED, { actorUserId: user.id });
  }
}
