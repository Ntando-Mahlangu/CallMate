import { Paddle, Environment, EventName } from "@paddle/paddle-node-sdk";
import type { PaymentProvider, PaymentEvent, NormalizedSubscriptionStatus } from "./types";

const SUBSCRIPTION_EVENTS = new Set<string>([
  EventName.SubscriptionCreated,
  EventName.SubscriptionActivated,
  EventName.SubscriptionTrialing,
  EventName.SubscriptionResumed,
  EventName.SubscriptionUpdated,
  EventName.SubscriptionPastDue,
  EventName.SubscriptionPaused,
  EventName.SubscriptionCanceled,
]);

export class PaddlePaymentProvider implements PaymentProvider {
  private readonly client: Paddle;
  private readonly webhookSecret: string;

  constructor(apiKey: string, webhookSecret: string) {
    this.client = new Paddle(apiKey, {
      environment:
        process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT === "production"
          ? Environment.production
          : Environment.sandbox,
    });
    this.webhookSecret = webhookSecret;
  }

  async verifyWebhook(rawBody: string, signatureHeader: string | null): Promise<PaymentEvent | null> {
    if (!signatureHeader) return null;

    const event = await this.client.webhooks.unmarshal(rawBody, this.webhookSecret, signatureHeader);
    if (!event) return null;

    if (!SUBSCRIPTION_EVENTS.has(event.eventType)) {
      return { kind: "ignored" };
    }

    const data = event.data as {
      id: string;
      customerId: string;
      status: NormalizedSubscriptionStatus;
      customData?: Record<string, unknown> | null;
      items?: Array<{ price?: { id?: string } | null }>;
      currentBillingPeriod?: { startsAt: string } | null;
    };
    const fromCustomData = data.customData?.organizationId;

    return {
      kind: "subscription",
      data: {
        organizationId: typeof fromCustomData === "string" ? fromCustomData : null,
        externalCustomerId: data.customerId,
        externalSubscriptionId: data.id,
        status: data.status,
        priceId: data.items?.[0]?.price?.id ?? null,
        currentPeriodStart: data.currentBillingPeriod?.startsAt
          ? new Date(data.currentBillingPeriod.startsAt)
          : null,
      },
    };
  }

  async createCustomerPortalUrl(
    externalCustomerId: string,
    externalSubscriptionId: string | null,
  ): Promise<string> {
    const portalSession = await this.client.customerPortalSessions.create(
      externalCustomerId,
      externalSubscriptionId ? [externalSubscriptionId] : [],
    );
    return portalSession.urls.general.overview;
  }
}
