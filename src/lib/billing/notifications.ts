import type { PlanTier } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { captureError } from "@/lib/observability";
import { planLabel } from "./plans";

type BillingNotification =
  | { type: "activated"; planTier: PlanTier }
  | { type: "payment_failed" }
  | { type: "canceled" }
  | { type: "paused" }
  | { type: "plan_changed"; fromTier: PlanTier; toTier: PlanTier }
  | { type: "refund_requested"; reason: string };

const SUBJECTS: Record<BillingNotification["type"], string> = {
  activated: "Your Outrun plan is active",
  payment_failed: "We couldn't process your Outrun payment",
  canceled: "Your Outrun subscription was canceled",
  paused: "Your Outrun subscription is paused",
  plan_changed: "Your Outrun plan has changed",
  refund_requested: "We received your refund request",
};

function bodyFor(notification: BillingNotification, organizationName: string): string {
  switch (notification.type) {
    case "activated":
      return `Your ${planLabel(notification.planTier)} plan for ${organizationName} is now active. Thanks for growing with Outrun.`;
    case "payment_failed":
      return `We couldn't process your latest payment for ${organizationName}. Please update your payment method from the Billing page to avoid losing access.`;
    // docs/outrun/14 "CANCELLATION" — don't guilt them, ask what could
    // be improved, offer export, explain what happens next, allow
    // reactivation, leave a positive final impression. Paddle's hosted
    // portal handles the cancel action itself (nothing to inject a
    // survey into there), so this email is where Outrun actually gets
    // to do all six — "reply to this email" is the honest version of
    // "ask for feedback" since there's no ticketing system behind an
    // in-app form to route it to.
    case "canceled":
      return `Your subscription for ${organizationName} has been canceled — no hard feelings, and the workspace is now on the Free plan.

What happens next: nothing is deleted. Your data stays exactly as it is, you keep Free-plan access, and paid features simply pause. You can export everything — Growth Blueprints, prospects, campaigns, and more — any time from Settings > Team > Export Your Data.

Whenever you're ready, reactivating takes one click: just pick a plan again from the Billing page.

If there's anything we could have done better, we'd genuinely like to hear it — just reply to this email. Thanks for giving Outrun a try.`;
    case "paused":
      return `Your subscription for ${organizationName} is currently paused.`;
    case "plan_changed":
      return `${organizationName} moved from ${planLabel(notification.fromTier)} to ${planLabel(notification.toTier)}.`;
    case "refund_requested":
      return `We received your refund request for ${organizationName}: "${notification.reason}". Our team reviews every request and will follow up by email.`;
  }
}

/**
 * Emails the workspace owner about a billing state change (docs/outrun/14
 * "BILLING NOTIFICATIONS"). Only covers events Paddle actually sends via
 * webhook — there's no "renewal upcoming" reminder here, since Paddle
 * doesn't fire that ahead of time and there's no scheduler to poll for
 * it. Never throws: a notification failure must never undo or block the
 * webhook's plan-tier update, same reasoning as logEvent().
 */
export async function notifyBillingEvent(
  organizationId: string,
  notification: BillingNotification,
) {
  try {
    const [organization, ownerMembership] = await Promise.all([
      prisma.organization.findUnique({ where: { id: organizationId }, select: { name: true } }),
      prisma.membership.findFirst({
        where: { organizationId, role: "OWNER" },
        include: { user: { select: { email: true } } },
      }),
    ]);
    if (!organization || !ownerMembership) return;

    await sendEmail({
      to: ownerMembership.user.email,
      subject: SUBJECTS[notification.type],
      text: bodyFor(notification, organization.name),
    });
  } catch (error) {
    captureError("billing.notify", error, { organizationId, type: notification.type });
  }
}
