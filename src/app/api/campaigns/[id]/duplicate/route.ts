import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { getCurrentSession } from "@/lib/session";
import { getCurrentOrganization, getMembershipFor } from "@/lib/org";
import { buildDuplicatePayload } from "@/lib/campaigns/duplicate";
import { enqueueJob, runJob } from "@/lib/jobs/queue";
import { UserFacingError, RateLimitError } from "@/lib/errors";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { captureError } from "@/lib/observability";

const GENERIC_ERROR =
  "We couldn't duplicate this campaign right now. Please try again in a moment.";

// Duplicating regenerates outreach for the same audience — the same
// reason src/app/api/campaigns/route.ts raises this.
export const maxDuration = 300;

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
    await checkRateLimit(`ai:${organization.id}`, RATE_LIMITS.AI.limit, RATE_LIMITS.AI.windowSeconds);

    const payload = await buildDuplicatePayload(organization.id, membership.role, id);
    const job = await enqueueJob(organization.id, "CAMPAIGN_GENERATION", payload);
    after(() => runJob(job.id));

    return NextResponse.json({ jobId: job.id });
  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json({ error: error.message }, { status: 429 });
    }
    if (error instanceof UserFacingError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    captureError("campaigns.duplicate", error, { organizationId: organization.id, campaignId: id });
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 502 });
  }
}
