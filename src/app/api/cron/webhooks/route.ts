import { NextRequest, NextResponse } from "next/server";
import { sweepPendingDeliveries } from "@/lib/webhooks/dispatch";
import { RateLimitError } from "@/lib/errors";
import { checkRateLimit, getClientIp, RATE_LIMITS } from "@/lib/rate-limit";
import { captureError } from "@/lib/observability";

/**
 * Called on a schedule (see DEPLOYMENT.md) — the only place that ever
 * actually attempts an outgoing webhook delivery (docs/outrun/11
 * "WEBHOOK SYSTEM"). dispatchEvent() only ever enqueues PENDING rows;
 * this sweep is what turns those into real HTTP calls, on new
 * deliveries and on retries whose backoff window has elapsed.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "The webhook delivery sweep is not configured." }, { status: 501 });
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
    const result = await sweepPendingDeliveries();
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json({ error: error.message }, { status: 429 });
    }
    captureError("cron.webhooks", error);
    return NextResponse.json({ error: "Sweep failed." }, { status: 500 });
  }
}
