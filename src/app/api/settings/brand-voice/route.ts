import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/session";
import { getCurrentOrganization, getMembershipFor } from "@/lib/org";
import { canManageCampaigns } from "@/lib/teams/permissions";
import { setBrandVoice, isBrandVoice } from "@/lib/org/brand-voice";
import { UserFacingError } from "@/lib/errors";
import { captureError } from "@/lib/observability";

const GENERIC_ERROR = "We couldn't save that right now. Please try again in a moment.";

export async function PATCH(request: NextRequest) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const organization = await getCurrentOrganization(session.user.id);
  if (!organization) {
    return NextResponse.json({ error: "No workspace found for this account." }, { status: 404 });
  }

  const membership = await getMembershipFor(session.user.id, organization.id);
  if (!membership || !canManageCampaigns(membership.role)) {
    return NextResponse.json(
      { error: "Only workspace owners and admins can change the brand voice." },
      { status: 403 },
    );
  }

  const { voice } = await request.json();
  if (!isBrandVoice(voice)) {
    return NextResponse.json({ error: "Choose one of the listed brand voices." }, { status: 400 });
  }

  try {
    await setBrandVoice(organization.id, voice);
    return NextResponse.json({ voice });
  } catch (error) {
    if (error instanceof UserFacingError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    captureError("settings.brand-voice", error, { organizationId: organization.id });
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 502 });
  }
}
