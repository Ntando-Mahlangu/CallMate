import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/session";
import { getCurrentOrganization } from "@/lib/org";
import { getPaddleClient } from "@/lib/billing/paddle-client";
import { captureError } from "@/lib/observability";

export async function POST() {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const organization = await getCurrentOrganization(session.user.id);
  if (!organization?.paddleCustomerId) {
    return NextResponse.json(
      { error: "No active subscription to manage." },
      { status: 404 },
    );
  }

  try {
    const paddle = getPaddleClient();
    const portalSession = await paddle.customerPortalSessions.create(
      organization.paddleCustomerId,
      organization.paddleSubscriptionId ? [organization.paddleSubscriptionId] : [],
    );
    return NextResponse.json({ url: portalSession.urls.general.overview });
  } catch (error) {
    captureError("billing.portal", error, { organizationId: organization.id });
    return NextResponse.json(
      { error: "We couldn't open billing management right now. Please try again in a moment." },
      { status: 502 },
    );
  }
}
