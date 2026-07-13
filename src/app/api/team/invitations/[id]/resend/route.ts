import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/session";
import { getCurrentOrganization, getMembershipFor } from "@/lib/org";
import { resendInvitation } from "@/lib/teams/invite";
import { UserFacingError } from "@/lib/errors";

const GENERIC_ERROR = "We couldn't resend that invitation right now. Please try again in a moment.";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const organization = await getCurrentOrganization(session.user.id);
  if (!organization) {
    return NextResponse.json({ error: "No workspace found for this account." }, { status: 404 });
  }
  const membership = await getMembershipFor(session.user.id, organization.id);
  if (!membership) {
    return NextResponse.json({ error: "No workspace found for this account." }, { status: 404 });
  }

  const { id } = await params;

  try {
    const invitation = await resendInvitation(organization.id, membership.role, id);
    return NextResponse.json({ invitation });
  } catch (error) {
    if (error instanceof UserFacingError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Resend invitation failed:", error);
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 502 });
  }
}
