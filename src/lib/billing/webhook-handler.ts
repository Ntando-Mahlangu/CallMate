import { EventName, type EventEntity } from "@paddle/paddle-node-sdk";
import type { PlanTier } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { captureError } from "@/lib/observability";
import { notifyBillingEvent } from "./notifications";

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

      const previous = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: { planTier: true, subscriptionStatus: true },
      });

      const status = event.data.status;
      const newPlanTier: PlanTier = ACTIVE_STATUSES.has(status) ? "STARTER" : "FREE";

      await prisma.organization.update({
        where: { id: organizationId },
        data: {
          paddleCustomerId: event.data.customerId,
          paddleSubscriptionId: event.data.id,
          subscriptionStatus: status,
          planTier: newPlanTier,
        },
      });

      // docs/outrun/14 "BILLING NOTIFICATIONS" — only on a real state
      // transition, so a duplicate/replayed webhook with the same status
      // doesn't send a second email. A status change among active variants
      // on the same tier (e.g. trialing -> active) isn't meaningful enough
      // to notify about on its own.
      if (previous && status !== previous.subscriptionStatus) {
        if (status === "canceled") {
          await notifyBillingEvent(organizationId, { type: "canceled" });
        } else if (status === "past_due") {
          await notifyBillingEvent(organizationId, { type: "payment_failed" });
        } else if (status === "paused") {
          await notifyBillingEvent(organizationId, { type: "paused" });
        } else if (ACTIVE_STATUSES.has(status) && previous.planTier !== newPlanTier) {
          await notifyBillingEvent(organizationId, { type: "activated", planTier: newPlanTier });
        }
      }
      return;
    }
    default:
      // Every other event type is intentionally ignored — nothing else in
      // this build phase reads from it.
      return;
  }
}
