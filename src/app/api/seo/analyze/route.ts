import { NextResponse } from "next/server";
import { after } from "next/server";
import { getCurrentSession } from "@/lib/session";
import { getCurrentOrganization } from "@/lib/org";
import { prisma } from "@/lib/prisma";
import { enqueueJob, runJob } from "@/lib/jobs/queue";
import { UserFacingError, RateLimitError } from "@/lib/errors";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { captureError } from "@/lib/observability";
import { isFeatureEnabled, FEATURE_FLAGS } from "@/lib/billing/feature-flags";

const GENERIC_ERROR =
  "We couldn't start analyzing your website right now. Please try again in a moment.";

// See src/app/api/blueprint/generate/route.ts for why this is raised.
export const maxDuration = 120;

export async function POST() {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const organization = await getCurrentOrganization(session.user.id);
  if (!organization) {
    return NextResponse.json({ error: "No workspace found." }, { status: 404 });
  }
  if (!isFeatureEnabled(organization.planTier, FEATURE_FLAGS.SEO_ENGINE, organization.id)) {
    return NextResponse.json(
      { error: "The SEO Engine is available on the Starter plan and above. Upgrade to unlock it." },
      { status: 403 },
    );
  }

  try {
    await checkRateLimit(`ai:${organization.id}`, RATE_LIMITS.AI.limit, RATE_LIMITS.AI.windowSeconds);

    const job = await enqueueJob(organization.id, "SEO_ANALYSIS", {});
    after(() => runJob(job.id));

    return NextResponse.json({ jobId: job.id });
  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json({ error: error.message }, { status: 429 });
    }
    if (error instanceof UserFacingError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    captureError("seo.analyze", error, { organizationId: organization.id });
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 502 });
  }
}

/** Fetches the latest analysis — used by the client after a job completes. */
export async function GET() {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const organization = await getCurrentOrganization(session.user.id);
  if (!organization) {
    return NextResponse.json({ error: "No workspace found." }, { status: 404 });
  }

  const analysis = await prisma.seoAnalysis.findFirst({
    where: { organizationId: organization.id },
    orderBy: { version: "desc" },
  });

  return NextResponse.json({ analysis });
}
