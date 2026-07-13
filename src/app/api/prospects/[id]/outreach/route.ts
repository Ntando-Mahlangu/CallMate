import { NextRequest, NextResponse } from "next/server";
import { UsageEventType } from "@prisma/client";
import { getCurrentSession } from "@/lib/session";
import { getCurrentOrganization } from "@/lib/org";
import { generateOutreach } from "@/lib/prospects/outreach";
import { checkAndRecordUsage } from "@/lib/billing/usage";
import { UserFacingError } from "@/lib/errors";
import { captureError } from "@/lib/observability";

const GENERIC_ERROR =
  "We couldn't generate outreach right now. Please try again in a moment.";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const organization = await getCurrentOrganization(session.user.id);
  if (!organization) {
    return NextResponse.json(
      { error: "No workspace found for this account." },
      { status: 404 },
    );
  }

  const { id } = await params;

  try {
    await checkAndRecordUsage(organization.id, UsageEventType.OUTREACH_GENERATION);
    const message = await generateOutreach(id, organization.id);
    return NextResponse.json({ message });
  } catch (error) {
    if (error instanceof UserFacingError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    captureError("prospects.outreach", error, { organizationId: organization.id, companyId: id });
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 502 });
  }
}
