import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentSession } from "@/lib/session";
import { getCurrentOrganization, getMembershipFor } from "@/lib/org";
import { canManageBilling } from "@/lib/teams/permissions";
import { requestRefund, getRefundRequestsForOrg } from "@/lib/billing/refunds";
import { UserFacingError, RateLimitError } from "@/lib/errors";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { captureError } from "@/lib/observability";
import { parseJsonBody } from "@/lib/validate-request";

const GENERIC_ERROR = "We couldn't submit that request right now. Please try again in a moment.";

const refundRequestSchema = z.object({
  reason: z.string({ message: "Tell us why you're requesting a refund." }),
});

export async function GET() {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const organization = await getCurrentOrganization(session.user.id);
  if (!organization) {
    return NextResponse.json({ error: "No workspace found for this account." }, { status: 404 });
  }

  const requests = await getRefundRequestsForOrg(organization.id);
  return NextResponse.json({ requests });
}

export async function POST(request: NextRequest) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const organization = await getCurrentOrganization(session.user.id);
  if (!organization) {
    return NextResponse.json({ error: "No workspace found for this account." }, { status: 404 });
  }

  const membership = await getMembershipFor(session.user.id, organization.id);
  if (!membership || !canManageBilling(membership.role)) {
    return NextResponse.json(
      { error: "Only workspace owners and admins can request a refund." },
      { status: 403 },
    );
  }

  const parsed = await parseJsonBody(request, refundRequestSchema);
  if (parsed.error) return parsed.error;
  const { reason } = parsed.data;

  try {
    await checkRateLimit(
      `refund-request:${organization.id}`,
      RATE_LIMITS.EXPORT.limit,
      RATE_LIMITS.EXPORT.windowSeconds,
    );
    const refundRequest = await requestRefund(
      organization.id,
      session.user.id,
      session.user.name,
      reason,
    );
    return NextResponse.json({ request: refundRequest });
  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json({ error: error.message }, { status: 429 });
    }
    if (error instanceof UserFacingError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    captureError("billing.refund-request", error, { organizationId: organization.id });
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 502 });
  }
}
