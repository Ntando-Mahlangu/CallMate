import { prisma } from "@/lib/prisma";
import { UserFacingError } from "@/lib/errors";
import { logEvent, EventType } from "@/lib/memory/log-event";
import { isPaidPlan } from "./plans";
import { notifyBillingEvent } from "./notifications";

const MAX_REASON_LENGTH = 1000;

/**
 * Records a refund request (docs/outrun/14 "REFUNDS"). This deliberately
 * does not call Paddle's refund/adjustment API — moving real money is a
 * hard-to-reverse action that belongs behind human review, not a
 * self-serve button. It only creates the auditable request; approving it
 * happens out-of-band (Paddle dashboard / support review).
 */
export async function requestRefund(
  organizationId: string,
  requestedByUserId: string,
  requestedByName: string,
  reason: string,
) {
  const trimmed = reason.trim();
  if (!trimmed) {
    throw new UserFacingError("Tell us why you're requesting a refund.");
  }
  if (trimmed.length > MAX_REASON_LENGTH) {
    throw new UserFacingError(`Reason must be ${MAX_REASON_LENGTH} characters or fewer.`);
  }

  const organization = await prisma.organization.findUniqueOrThrow({
    where: { id: organizationId },
    select: { planTier: true },
  });
  if (!isPaidPlan(organization.planTier)) {
    throw new UserFacingError("There's no paid subscription on this workspace to refund.");
  }

  const request = await prisma.refundRequest.create({
    data: { organizationId, requestedByUserId, requestedByName, reason: trimmed },
  });

  await logEvent(
    organizationId,
    EventType.REFUND_REQUESTED,
    `${requestedByName} requested a refund: "${trimmed}"`,
  );

  await notifyBillingEvent(organizationId, { type: "refund_requested", reason: trimmed });

  return request;
}

export async function getRefundRequestsForOrg(organizationId: string) {
  return prisma.refundRequest.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
  });
}
