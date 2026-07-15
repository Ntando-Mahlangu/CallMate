import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentSession } from "@/lib/session";
import { getCurrentOrganization, getMembershipFor } from "@/lib/org";
import { removeMember, updateMemberRole } from "@/lib/teams/invite";
import { UserFacingError } from "@/lib/errors";
import { captureError } from "@/lib/observability";
import { parseJsonBody } from "@/lib/validate-request";

const GENERIC_ERROR = "We couldn't update that team member right now. Please try again in a moment.";

const updateMemberRoleSchema = z.object({
  role: z.enum(["ADMIN", "MANAGER", "MEMBER", "VIEWER"], { message: "Choose a valid role." }),
});

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
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
    await removeMember(organization.id, membership.role, session.user.id, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof UserFacingError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    captureError("team.members.remove", error, { organizationId: organization.id, membershipId: id });
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 502 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
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
  const parsed = await parseJsonBody(request, updateMemberRoleSchema);
  if (parsed.error) return parsed.error;
  const { role } = parsed.data;

  try {
    const updated = await updateMemberRole(
      organization.id,
      membership.role,
      session.user.id,
      id,
      role,
    );
    return NextResponse.json({ member: updated });
  } catch (error) {
    if (error instanceof UserFacingError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    captureError("team.members.update-role", error, { organizationId: organization.id, membershipId: id });
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 502 });
  }
}
