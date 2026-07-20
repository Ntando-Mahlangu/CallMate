import type { PlanTier } from "@prisma/client";
import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { captureError } from "@/lib/observability";
import { orgProfileTag } from "@/lib/cache-tags";
import { logAuditEvent, AuditAction } from "@/lib/audit/log-audit-event";
import { createNotification, NotificationType } from "@/lib/notifications/create-notification";
import type { PaymentEvent, SubscriptionEvent } from "./provider";
import { notifyBillingEvent } from "./notifications";
import { planTierForPriceId } from "./plans";

const ACTIVE_STATUSES = new Set(["active", "trialing"]);

async function resolveOrganizationId(data: SubscriptionEvent): Promise<string | null> {
  if (data.organizationId) return data.organizationId;

  const existing = await prisma.organization.findFirst({
    where: { paddleSubscriptionId: data.externalSubscriptionId },
    select: { id: true },
  });
  return existing?.id ?? null;
}

/**
 * The ONLY code path that ever changes an Organization's planTier. It only
 * runs after the payment provider has verified the webhook's signature
 * (src/lib/billing/provider) — no client request can reach this (Article
 * XII: never trust the frontend).
 */
export async function handlePaymentEvent(event: PaymentEvent) {
  switch (event.kind) {
    case "subscription": {
      const organizationId = await resolveOrganizationId(event.data);
      if (!organizationId) {
        captureError(
          "billing.webhook.unresolved-org",
          new Error(`Could not resolve an organization for subscription ${event.data.externalSubscriptionId}`),
        );
        return;
      }

      const previous = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: { planTier: true, subscriptionStatus: true },
      });

      const status = event.data.status;
      let newPlanTier: PlanTier = "FREE";
      if (ACTIVE_STATUSES.has(status)) {
        const resolvedTier = planTierForPriceId(event.data.priceId);
        if (resolvedTier) {
          newPlanTier = resolvedTier;
        } else {
          // The subscription is active but its price ID doesn't match any
          // configured plan (a Paddle price was deleted/changed, or a price
          // ID env var is misconfigured) — fall back to Starter rather than
          // silently leaving the org on Free, but capture it so the
          // mismatch actually gets fixed.
          newPlanTier = "STARTER";
          captureError(
            "billing.webhook.unresolved-price",
            new Error(
              `Active subscription ${event.data.externalSubscriptionId} has an unrecognized price ID: ${event.data.priceId ?? "none"}`,
            ),
          );
        }
      }

      await prisma.organization.update({
        where: { id: organizationId },
        data: {
          paddleCustomerId: event.data.externalCustomerId,
          paddleSubscriptionId: event.data.externalSubscriptionId,
          subscriptionStatus: status,
          planTier: newPlanTier,
          // Only overwrite when Paddle actually sent one — never clobber a
          // previously-known period start with null on an event that
          // happens not to carry it.
          ...(event.data.currentPeriodStart
            ? { currentPeriodStart: event.data.currentPeriodStart }
            : {}),
        },
      });
      revalidateTag(orgProfileTag(organizationId), "max");

      // docs/outrun/12 "AUDIT LOG" — "Record: Billing Changes." No acting
      // user here: Paddle's webhook is the only path that ever changes
      // planTier, so actorUserId is left null (a system-initiated change).
      if (previous && previous.planTier !== newPlanTier) {
        await logAuditEvent(organizationId, AuditAction.BILLING_CHANGED, {
          targetType: "organization",
          targetId: organizationId,
          metadata: { fromTier: previous.planTier, toTier: newPlanTier, subscriptionStatus: status },
        });
      }

      // docs/outrun/14 "BILLING NOTIFICATIONS" — only on a real state
      // transition, so a duplicate/replayed webhook with the same status
      // doesn't send a second email. A status change among active variants
      // on the same tier (e.g. trialing -> active) isn't meaningful enough
      // to notify about on its own.
      if (previous && status !== previous.subscriptionStatus) {
        if (status === "canceled") {
          await notifyBillingEvent(organizationId, { type: "canceled" });
          await createNotification(
            organizationId,
            NotificationType.BILLING_EVENT,
            "Subscription canceled",
            "Your Outrun subscription was canceled and the workspace has moved to the Free plan.",
            "/billing",
          );
        } else if (status === "past_due") {
          await notifyBillingEvent(organizationId, { type: "payment_failed" });
          await createNotification(
            organizationId,
            NotificationType.BILLING_EVENT,
            "Payment failed",
            "We couldn't process your latest payment. Update your payment method to avoid losing access.",
            "/billing",
          );
        } else if (status === "paused") {
          await notifyBillingEvent(organizationId, { type: "paused" });
          await createNotification(
            organizationId,
            NotificationType.BILLING_EVENT,
            "Subscription paused",
            "Your Outrun subscription is currently paused.",
            "/billing",
          );
        } else if (ACTIVE_STATUSES.has(status) && previous.planTier !== newPlanTier) {
          await notifyBillingEvent(organizationId, { type: "activated", planTier: newPlanTier });
          await createNotification(
            organizationId,
            NotificationType.BILLING_EVENT,
            "Plan activated",
            `Your ${newPlanTier} plan is now active.`,
            "/billing",
          );
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
