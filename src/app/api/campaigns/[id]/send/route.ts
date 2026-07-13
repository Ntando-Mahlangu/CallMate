import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/session";
import { getCurrentOrganization } from "@/lib/org";
import { sendCampaignOutreach } from "@/lib/outreach/send";
import { UserFacingError } from "@/lib/errors";
import { captureError } from "@/lib/observability";

const GENERIC_ERROR = "We couldn't send this campaign right now. Please try again in a moment.";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const organization = await getCurrentOrganization(session.user.id);
  if (!organization) {
    return NextResponse.json({ error: "No workspace found for this account." }, { status: 404 });
  }

  const { id } = await params;

  try {
    const summary = await sendCampaignOutreach(organization.id, id);
    return NextResponse.json(summary);
  } catch (error) {
    if (error instanceof UserFacingError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    captureError("campaigns.send.route", error, { organizationId: organization.id, campaignId: id });
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 502 });
  }
}
