import { PaddlePaymentProvider } from "./paddle-provider";
import type { PaymentProvider } from "./types";

export type { PaymentProvider, PaymentEvent, SubscriptionEvent, NormalizedSubscriptionStatus } from "./types";

let provider: PaymentProvider | null = null;

/**
 * Add another payment processor by writing a new class that implements
 * PaymentProvider and branching on an env var here — no other file in
 * the app should need to change (docs/outrun/11 Article X precedent,
 * mirroring src/lib/ai/index.ts and src/lib/leads/index.ts).
 */
export function getPaymentProvider(): PaymentProvider {
  if (provider) return provider;

  const apiKey = process.env.PADDLE_API_KEY;
  const webhookSecret = process.env.PADDLE_WEBHOOK_SECRET;
  if (!apiKey || !webhookSecret) {
    throw new Error(
      "PADDLE_API_KEY and PADDLE_WEBHOOK_SECRET are not set. Add them to .env to enable billing.",
    );
  }

  provider = new PaddlePaymentProvider(apiKey, webhookSecret);
  return provider;
}

export function isBillingConfigured(): boolean {
  return Boolean(process.env.PADDLE_API_KEY && process.env.PADDLE_WEBHOOK_SECRET);
}
