import { NextRequest, NextResponse } from "next/server";
import { getPaymentProvider, isBillingConfigured } from "@/lib/billing/provider";
import { handlePaymentEvent } from "@/lib/billing/webhook-handler";
import { RateLimitError } from "@/lib/errors";
import { checkRateLimit, getClientIp, RATE_LIMITS } from "@/lib/rate-limit";
import { captureError } from "@/lib/observability";

export async function POST(request: NextRequest) {
  const signature = request.headers.get("paddle-signature");

  if (!isBillingConfigured()) {
    return NextResponse.json({ error: "Webhook not configured." }, { status: 501 });
  }

  try {
    await checkRateLimit(
      `webhook:${getClientIp(request)}`,
      RATE_LIMITS.WEBHOOK.limit,
      RATE_LIMITS.WEBHOOK.windowSeconds,
    );
  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json({ error: error.message }, { status: 429 });
    }
    throw error;
  }

  const rawBody = await request.text();

  try {
    const event = await getPaymentProvider().verifyWebhook(rawBody, signature);
    if (!event) {
      return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
    }

    await handlePaymentEvent(event);
    return NextResponse.json({ received: true });
  } catch (error) {
    captureError("billing.webhook", error);
    return NextResponse.json({ error: "Invalid webhook." }, { status: 400 });
  }
}
