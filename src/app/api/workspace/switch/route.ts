import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getCurrentSession } from "@/lib/session";
import { getMembershipFor, ACTIVE_ORG_COOKIE } from "@/lib/org";

export async function POST(request: NextRequest) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { organizationId } = await request.json();
  if (typeof organizationId !== "string" || !organizationId) {
    return NextResponse.json({ error: "Missing workspace." }, { status: 400 });
  }

  const membership = await getMembershipFor(session.user.id, organizationId);
  if (!membership) {
    return NextResponse.json({ error: "You don't have access to that workspace." }, { status: 403 });
  }

  (await cookies()).set(ACTIVE_ORG_COOKIE, organizationId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return NextResponse.json({ ok: true });
}
