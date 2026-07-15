import { AuditAction, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { captureError } from "@/lib/observability";

/**
 * Writes one row to the security/administrative Audit Log (docs/outrun/12
 * "AUDIT LOG" — "Never allow silent administrative actions"). Separate
 * from the Business Brain's Event log (src/lib/memory/log-event.ts), which
 * tracks growth activity for the AI to reason about, not who-did-what for
 * accountability. Never throws — a logging failure should never break the
 * action it's describing.
 */
export async function logAuditEvent(
  organizationId: string,
  action: AuditAction,
  options: {
    actorUserId?: string;
    targetType?: string;
    targetId?: string;
    metadata?: Record<string, unknown>;
  } = {},
) {
  try {
    await prisma.auditLog.create({
      data: {
        organizationId,
        action,
        actorUserId: options.actorUserId,
        targetType: options.targetType,
        targetId: options.targetId,
        metadata: options.metadata as Prisma.InputJsonValue | undefined,
      },
    });
  } catch (error) {
    captureError("audit.log-event", error, { organizationId, action });
  }
}

export { AuditAction };
