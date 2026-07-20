import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentSession } from "@/lib/session";
import { getCurrentOrganization } from "@/lib/org";
import { setOutreachReplyStatus } from "@/lib/outreach/send";
import { UserFacingError } from "@/lib/errors";
import { captureError } from "@/lib/observability";
import { parseJsonBody } from "@/lib/validate-request";

const GENERIC_ERROR = "We couldn't update that right now. Please try again in a moment.";

const setReplyStatusSchema = z.object({
  gotReply: z.boolean({ message: "Missing reply status." }),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const organization = await getCurrentOrganization(session.user.id);
  if (!organization) {
    return NextResponse.json({ error: "No workspace found for this account." }, { status: 404 });
  }

  const { id } = await params;
  const parsed = await parseJsonBody(request, setReplyStatusSchema);
  if (parsed.error) return parsed.error;
  const { gotReply } = parsed.data;

  try {
    const message = await setOutreachReplyStatus(organization.id, id, gotReply);
    return NextResponse.json({ message });
  } catch (error) {
    if (error instanceof UserFacingError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    captureError("outreach.reply.route", error, { organizationId: organization.id, messageId: id });
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 502 });
  }
}
