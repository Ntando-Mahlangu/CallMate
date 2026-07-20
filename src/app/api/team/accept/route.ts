import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { getCurrentSession } from "@/lib/session";
import { acceptInvitation } from "@/lib/teams/invite";
import { ACTIVE_ORG_COOKIE } from "@/lib/org";
import { UserFacingError } from "@/lib/errors";
import { captureError } from "@/lib/observability";
import { parseJsonBody } from "@/lib/validate-request";

const GENERIC_ERROR = "We couldn't accept that invitation right now. Please try again in a moment.";

const acceptInvitationSchema = z.object({
  token: z.string({ message: "Missing invitation token." }).min(1, "Missing invitation token."),
});

export async function POST(request: NextRequest) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const parsed = await parseJsonBody(request, acceptInvitationSchema);
  if (parsed.error) return parsed.error;
  const { token } = parsed.data;

  try {
    const organizationId = await acceptInvitation(token, {
      id: session.user.id,
      email: session.user.email,
    });
    (await cookies()).set(ACTIVE_ORG_COOKIE, organizationId, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof UserFacingError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    captureError("team.accept", error, { userId: session.user.id });
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 502 });
  }
}
