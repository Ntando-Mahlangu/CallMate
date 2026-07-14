import { NextRequest, NextResponse } from "next/server";
import type { ReviewPeriod } from "@prisma/client";
import { getCurrentSession } from "@/lib/session";
import { getCurrentOrganization } from "@/lib/org";
import { prisma } from "@/lib/prisma";
import { generateStrategicReview } from "@/lib/ceo-agent/strategic-review";
import { UserFacingError, RateLimitError } from "@/lib/errors";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { captureError } from "@/lib/observability";

const PERIODS: ReviewPeriod[] = ["WEEKLY", "MONTHLY", "QUARTERLY"];
const GENERIC_ERROR =
  "We couldn't generate that review right now. Please try again in a moment.";

export async function GET() {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const organization = await getCurrentOrganization(session.user.id);
  if (!organization) {
    return NextResponse.json({ error: "No workspace found for this account." }, { status: 404 });
  }

  const reviews = await prisma.strategicReview.findMany({
    where: { organizationId: organization.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ reviews });
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

  const { period } = await request.json();
  if (typeof period !== "string" || !PERIODS.includes(period as ReviewPeriod)) {
    return NextResponse.json({ error: "Choose a valid review period." }, { status: 400 });
  }

  try {
    await checkRateLimit(`ai:${organization.id}`, RATE_LIMITS.AI.limit, RATE_LIMITS.AI.windowSeconds);
    const review = await generateStrategicReview(organization.id, period as ReviewPeriod);
    return NextResponse.json({ review });
  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json({ error: error.message }, { status: 429 });
    }
    if (error instanceof UserFacingError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    captureError("ceo-agent.reviews.create", error, { organizationId: organization.id });
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 502 });
  }
}
