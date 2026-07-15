import { NextRequest, NextResponse } from "next/server";
import { RecommendationRating } from "@prisma/client";
import { getCurrentSession } from "@/lib/session";
import { getCurrentOrganization } from "@/lib/org";
import { rateRecommendation } from "@/lib/ceo-agent/recommendation-feedback";
import { UserFacingError } from "@/lib/errors";
import { captureError } from "@/lib/observability";

const GENERIC_ERROR = "We couldn't save that right now. Please try again in a moment.";
const RATINGS = Object.values(RecommendationRating);

export async function POST(request: NextRequest) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const organization = await getCurrentOrganization(session.user.id);
  if (!organization) {
    return NextResponse.json({ error: "No workspace found for this account." }, { status: 404 });
  }

  const { itemId, itemTitle, rating } = await request.json();
  if (typeof itemId !== "string" || typeof itemTitle !== "string") {
    return NextResponse.json({ error: "That recommendation could not be found." }, { status: 400 });
  }
  if (!RATINGS.includes(rating)) {
    return NextResponse.json({ error: "Choose a valid rating." }, { status: 400 });
  }

  try {
    await rateRecommendation(organization.id, itemId, itemTitle, rating);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof UserFacingError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    captureError("opportunities.feedback", error, { organizationId: organization.id });
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 502 });
  }
}
