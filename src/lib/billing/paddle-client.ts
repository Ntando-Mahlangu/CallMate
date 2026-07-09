import { Paddle, Environment } from "@paddle/paddle-node-sdk";

let client: Paddle | null = null;

export function getPaddleClient(): Paddle {
  if (client) return client;

  const apiKey = process.env.PADDLE_API_KEY;
  if (!apiKey) {
    throw new Error("PADDLE_API_KEY is not set. Add it to .env to enable billing.");
  }

  client = new Paddle(apiKey, {
    environment:
      process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT === "production"
        ? Environment.production
        : Environment.sandbox,
  });
  return client;
}

export function isBillingConfigured(): boolean {
  return Boolean(process.env.PADDLE_API_KEY && process.env.PADDLE_WEBHOOK_SECRET);
}
