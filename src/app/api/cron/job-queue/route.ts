import { NextRequest, NextResponse } from "next/server";
import { sweepStuckJobs } from "@/lib/jobs/queue";
import { RateLimitError } from "@/lib/errors";
import { checkRateLimit, getClientIp, RATE_LIMITS } from "@/lib/rate-limit";
import { captureError } from "@/lib/observability";

/**
 * Called on a schedule (see DEPLOYMENT.md), same pattern as the other
 * cron routes — catches background jobs that never ran because the
 * serverless instance that enqueued them didn't survive long enough for
 * `after()` to fire, or that died mid-execution.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "The job queue sweep is not configured." }, { status: 501 });
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    await checkRateLimit(
      `webhook:${getClientIp(request)}`,
      RATE_LIMITS.WEBHOOK.limit,
      RATE_LIMITS.WEBHOOK.windowSeconds,
    );
    const result = await sweepStuckJobs();
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json({ error: error.message }, { status: 429 });
    }
    captureError("cron.job-queue", error);
    return NextResponse.json({ error: "Sweep failed." }, { status: 500 });
  }
}
