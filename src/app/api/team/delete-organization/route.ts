import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { getCurrentSession } from "@/lib/session";
import { getCurrentOrganization, getMembershipFor, ACTIVE_ORG_COOKIE } from "@/lib/org";
import { deleteOrganization } from "@/lib/teams/delete-organization";
import { UserFacingError } from "@/lib/errors";
import { captureError } from "@/lib/observability";
import { parseJsonBody } from "@/lib/validate-request";

const GENERIC_ERROR = "We couldn't delete this workspace right now. Please try again in a moment.";

const deleteOrganizationSchema = z.object({
  confirmName: z.string({ message: "Type the workspace name to confirm." }).trim().min(1, "Type the workspace name to confirm."),
});

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
  if (!membership) {
    return NextResponse.json({ error: "No workspace found for this account." }, { status: 404 });
  }

  const parsed = await parseJsonBody(request, deleteOrganizationSchema);
  if (parsed.error) return parsed.error;

  try {
    await deleteOrganization(organization.id, session.user.id, membership.role, parsed.data.confirmName);

    (await cookies()).delete(ACTIVE_ORG_COOKIE);

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof UserFacingError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    captureError("team.delete-organization", error, { organizationId: organization.id });
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 502 });
  }
}
