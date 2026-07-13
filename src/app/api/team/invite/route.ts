import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/session";
import { getCurrentOrganization, getMembershipFor } from "@/lib/org";
import { createInvitation } from "@/lib/teams/invite";
import { UserFacingError } from "@/lib/errors";
import type { MembershipRole } from "@prisma/client";

const ROLES: MembershipRole[] = ["ADMIN", "MANAGER", "MEMBER", "VIEWER"];
const GENERIC_ERROR = "We couldn't send that invitation right now. Please try again in a moment.";

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

  const { email, role } = await request.json();
  if (typeof email !== "string" || !email.trim()) {
    return NextResponse.json({ error: "Enter an email address." }, { status: 400 });
  }
  if (typeof role !== "string" || !ROLES.includes(role as MembershipRole)) {
    return NextResponse.json({ error: "Choose a valid role." }, { status: 400 });
  }

  try {
    const invitation = await createInvitation(
      organization.id,
      session.user.id,
      membership.role,
      email,
      role as MembershipRole,
    );
    return NextResponse.json({ invitation });
  } catch (error) {
    if (error instanceof UserFacingError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Team invitation failed:", error);
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 502 });
  }
}
