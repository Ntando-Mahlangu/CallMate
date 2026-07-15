import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentSession } from "@/lib/session";
import { getCurrentOrganization, getMembershipFor } from "@/lib/org";
import { createInvitation } from "@/lib/teams/invite";
import { UserFacingError } from "@/lib/errors";
import { captureError } from "@/lib/observability";
import { parseJsonBody } from "@/lib/validate-request";
import type { MembershipRole } from "@prisma/client";

const GENERIC_ERROR = "We couldn't send that invitation right now. Please try again in a moment.";

const inviteSchema = z.object({
  email: z.string({ message: "Enter an email address." }).trim().min(1, "Enter an email address."),
  role: z.enum(["ADMIN", "MANAGER", "MEMBER", "VIEWER"], { message: "Choose a valid role." }),
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

  const parsed = await parseJsonBody(request, inviteSchema);
  if (parsed.error) return parsed.error;
  const { email, role } = parsed.data;

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
    captureError("team.invite", error, { organizationId: organization.id });
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 502 });
  }
}
