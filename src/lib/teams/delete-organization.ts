import { revalidateTag } from "next/cache";
import type { MembershipRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { UserFacingError } from "@/lib/errors";
import { logAuditEvent, AuditAction } from "@/lib/audit/log-audit-event";
import { orgProfileTag } from "@/lib/cache-tags";
import { canDeleteOrganization } from "./permissions";

/**
 * docs/outrun/12 "Soft Delete Support" / docs/outrun/15 "Data deletion" —
 * a real, explicit "delete this workspace" action, not a blanket refactor
 * of every tenant-scoped query. Sets Organization.deletedAt; every other
 * table keeps its rows (nothing here cascades a hard delete), but
 * src/lib/org.ts's getCurrentOrganization now treats a soft-deleted
 * organization as if it doesn't exist, so every existing "if
 * (!organization) redirect(...)" check across the app is what actually
 * makes the workspace inaccessible — one entry-point change instead of a
 * sweep across every query.
 */
export async function deleteOrganization(
  organizationId: string,
  actingUserId: string,
  actingRole: MembershipRole,
  confirmationName: string,
) {
  if (!canDeleteOrganization(actingRole)) {
    throw new UserFacingError("Only the workspace owner can delete this workspace.");
  }

  const organization = await prisma.organization.findFirst({
    where: { id: organizationId, deletedAt: null },
  });
  if (!organization) {
    throw new UserFacingError("That workspace could not be found.");
  }

  if (confirmationName.trim() !== organization.name) {
    throw new UserFacingError("Type the workspace name exactly to confirm deletion.");
  }

  const deleted = await prisma.organization.update({
    where: { id: organizationId },
    data: { deletedAt: new Date() },
  });

  // docs/outrun/12 "CACHING" — src/lib/org.ts's getCurrentOrganization
  // reads through unstable_cache; without this, a deleted workspace could
  // keep resolving as "live" from cache for up to its 5-minute revalidate
  // window instead of disappearing immediately.
  revalidateTag(orgProfileTag(organizationId), "max");

  await logAuditEvent(organizationId, AuditAction.WORKSPACE_DELETED, {
    actorUserId: actingUserId,
    metadata: { name: organization.name },
  });

  return deleted;
}
