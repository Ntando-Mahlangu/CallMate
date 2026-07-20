import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { getCurrentSession } from "@/lib/session";
import { getMembershipFor, ACTIVE_ORG_COOKIE } from "@/lib/org";
import { parseJsonBody } from "@/lib/validate-request";

const switchWorkspaceSchema = z.object({
  organizationId: z.string({ message: "Missing workspace." }).min(1, "Missing workspace."),
});

export async function POST(request: NextRequest) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const parsed = await parseJsonBody(request, switchWorkspaceSchema);
  if (parsed.error) return parsed.error;
  const { organizationId } = parsed.data;

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
