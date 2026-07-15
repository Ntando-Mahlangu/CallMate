import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { getCurrentSession } from "@/lib/session";
import { getCurrentOrganization } from "@/lib/org";
import { enqueueJob, runJob } from "@/lib/jobs/queue";
import { UserFacingError, RateLimitError } from "@/lib/errors";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { captureError } from "@/lib/observability";

const GENERIC_ERROR =
  "We couldn't start building this campaign right now. Please try again in a moment.";

// A campaign generates one message per selected company sequentially —
// see src/app/api/blueprint/generate/route.ts for why this is raised.
export const maxDuration = 300;

export async function POST(request: NextRequest) {
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

  const { name, objective, companyIds, abTest } = await request.json();
  if (typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "Give your campaign a name." }, { status: 400 });
  }
  if (typeof objective !== "string" || !objective.trim()) {
    return NextResponse.json({ error: "Choose a campaign objective." }, { status: 400 });
  }
  if (!Array.isArray(companyIds) || companyIds.length === 0) {
    return NextResponse.json(
      { error: "Select at least one prospect for this campaign." },
      { status: 400 },
    );
  }

  try {
    await checkRateLimit(`ai:${organization.id}`, RATE_LIMITS.AI.limit, RATE_LIMITS.AI.windowSeconds);

    const job = await enqueueJob(organization.id, "CAMPAIGN_GENERATION", {
      name: name.trim(),
      objective: objective.trim(),
      companyIds,
      abTest: abTest === true,
    });
    after(() => runJob(job.id));

    return NextResponse.json({ jobId: job.id });
  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json({ error: error.message }, { status: 429 });
    }
    if (error instanceof UserFacingError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    captureError("campaigns.create", error, { organizationId: organization.id });
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 502 });
  }
}
