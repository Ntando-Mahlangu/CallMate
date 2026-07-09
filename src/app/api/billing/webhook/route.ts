import { NextRequest, NextResponse } from "next/server";
import { getPaddleClient } from "@/lib/billing/paddle-client";
import { handlePaddleEvent } from "@/lib/billing/webhook-handler";

export async function POST(request: NextRequest) {
  const signature = request.headers.get("paddle-signature");
  const secret = process.env.PADDLE_WEBHOOK_SECRET;

  if (!signature || !secret) {
    return NextResponse.json({ error: "Webhook not configured." }, { status: 501 });
  }

  const rawBody = await request.text();

  try {
    const paddle = getPaddleClient();
    const event = await paddle.webhooks.unmarshal(rawBody, secret, signature);
    if (!event) {
      return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
    }

    await handlePaddleEvent(event);
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Paddle webhook processing failed:", error);
    return NextResponse.json({ error: "Invalid webhook." }, { status: 400 });
  }
}
