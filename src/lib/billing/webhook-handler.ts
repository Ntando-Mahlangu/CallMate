import { EventName, type EventEntity } from "@paddle/paddle-node-sdk";
import { prisma } from "@/lib/prisma";
import { captureError } from "@/lib/observability";

const ACTIVE_STATUSES = new Set(["active", "trialing"]);

async function resolveOrganizationId(data: {
  id: string;
  customData?: Record<string, unknown> | null;
}): Promise<string | null> {
  const fromCustomData = data.customData?.organizationId;
  if (typeof fromCustomData === "string") return fromCustomData;

  const existing = await prisma.organization.findFirst({
    where: { paddleSubscriptionId: data.id },
    select: { id: true },
  });
  return existing?.id ?? null;
}

/**
 * The ONLY code path that ever changes an Organization's planTier. It only
 * runs after Paddle's signature has been verified by the caller — no
 * client request can reach this (Article XII: never trust the frontend).
 */
export async function handlePaddleEvent(event: EventEntity) {
  switch (event.eventType) {
    case EventName.SubscriptionCreated:
    case EventName.SubscriptionActivated:
    case EventName.SubscriptionTrialing:
    case EventName.SubscriptionResumed:
    case EventName.SubscriptionUpdated:
    case EventName.SubscriptionPastDue:
    case EventName.SubscriptionPaused:
    case EventName.SubscriptionCanceled: {
      const organizationId = await resolveOrganizationId(event.data);
      if (!organizationId) {
        captureError(
          "billing.webhook.unresolved-org",
          new Error(`Could not resolve an organization for subscription ${event.data.id}`),
          { eventType: event.eventType },
        );
        return;
      }

      const status = event.data.status;
      await prisma.organization.update({
        where: { id: organizationId },
        data: {
          paddleCustomerId: event.data.customerId,
          paddleSubscriptionId: event.data.id,
          subscriptionStatus: status,
          planTier: ACTIVE_STATUSES.has(status) ? "STARTER" : "FREE",
        },
      });
      return;
    }
    default:
      // Every other event type is intentionally ignored — nothing else in
      // this build phase reads from it.
      return;
  }
}
