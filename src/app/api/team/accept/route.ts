import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getCurrentSession } from "@/lib/session";
import { acceptInvitation } from "@/lib/teams/invite";
import { ACTIVE_ORG_COOKIE } from "@/lib/org";
import { UserFacingError } from "@/lib/errors";
import { captureError } from "@/lib/observability";

const GENERIC_ERROR = "We couldn't accept that invitation right now. Please try again in a moment.";

export async function POST(request: NextRequest) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { token } = await request.json();
  if (typeof token !== "string" || !token) {
    return NextResponse.json({ error: "Missing invitation token." }, { status: 400 });
  }

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
