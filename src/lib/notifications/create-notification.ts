import { NotificationType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { captureError } from "@/lib/observability";

/**
 * Writes one row to the in-app Notification feed (docs/outrun/04
 * "NOTIFICATIONS" — "Campaign finished. Reply received. Growth Review
 * ready... Never notify users for trivial events."). Org-scoped rather
 * than per-user: Outrun workspaces are small teams where everyone should
 * see the same growth-relevant events, so there's no per-recipient read
 * receipt. Never throws — a notification failure must never block the
 * action it's describing.
 */
export async function createNotification(
  organizationId: string,
  type: NotificationType,
  title: string,
  body: string,
  link?: string,
) {
  try {
    await prisma.notification.create({
      data: { organizationId, type, title, body, link },
    });
  } catch (error) {
    captureError("notifications.create", error, { organizationId, type });
  }
}

export { NotificationType };
