import { NextResponse } from "next/server";
import type { MembershipRole } from "@prisma/client";
import { getCurrentSession } from "@/lib/session";
import { getCurrentOrganization, getMembershipFor } from "@/lib/org";
import { removeMember, updateMemberRole } from "@/lib/teams/invite";
import { UserFacingError } from "@/lib/errors";
import { captureError } from "@/lib/observability";

const ROLES: MembershipRole[] = ["ADMIN", "MANAGER", "MEMBER", "VIEWER"];
const GENERIC_ERROR = "We couldn't update that team member right now. Please try again in a moment.";

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
  const { role } = await request.json();
  if (typeof role !== "string" || !ROLES.includes(role as MembershipRole)) {
    return NextResponse.json({ error: "Choose a valid role." }, { status: 400 });
  }

  try {
    const updated = await updateMemberRole(organization.id, membership.role, id, role as MembershipRole);
    return NextResponse.json({ member: updated });
  } catch (error) {
    if (error instanceof UserFacingError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    captureError("team.members.update-role", error, { organizationId: organization.id, membershipId: id });
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 502 });
  }
}
