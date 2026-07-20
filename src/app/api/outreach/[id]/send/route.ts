import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/session";
import { getCurrentOrganization } from "@/lib/org";
import { sendOutreachMessage } from "@/lib/outreach/send";
import { prisma } from "@/lib/prisma";
import { UserFacingError } from "@/lib/errors";
import { captureError } from "@/lib/observability";

const GENERIC_ERROR = "We couldn't send that message right now. Please try again in a moment.";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const organization = await getCurrentOrganization(session.user.id);
  if (!organization) {
    return NextResponse.json({ error: "No workspace found for this account." }, { status: 404 });
  }

  const { id } = await params;

  try {
    const message = await sendOutreachMessage(organization.id, id);
    return NextResponse.json({ message });
  } catch (error) {
    // Include the message's current state either way — sendOutreachMessage
    // marks FAILED in the DB before throwing on a genuine send failure, so
    // the client can reflect Retry immediately without a page reload.
    const message = await prisma.outreachMessage.findFirst({
      where: { id, company: { organizationId: organization.id } },
    });

    if (error instanceof UserFacingError) {
      return NextResponse.json({ error: error.message, message }, { status: 403 });
    }
    captureError("outreach.send.route", error, { organizationId: organization.id, messageId: id });
    return NextResponse.json({ error: GENERIC_ERROR, message }, { status: 502 });
  }
}
