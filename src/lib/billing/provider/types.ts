// docs/outrun/11 "ARCHITECTURE PRINCIPLES" — "Every provider should
// implement a common interface... no integration should require major
// changes to the application architecture." Mirrors the shape already
// established for AI providers (src/lib/ai/types.ts) and lead-data
// providers (src/lib/leads/types.ts): a provider-agnostic DTO here, one
// concrete class per vendor, business logic never imports the vendor SDK
// directly.
//
// Scope: this abstracts the SERVER-SIDE operations business logic
// actually depends on — verifying/parsing webhooks and generating a
// customer-portal URL. Checkout itself is deliberately NOT abstracted:
// it's a browser-side hosted overlay (Paddle.js) with no server
// round-trip, and every processor's checkout UI/SDK is fundamentally
// different (Paddle's overlay vs. Stripe's redirect-based Checkout vs.
// PayPal's own SDK) — forcing a shared interface over incompatible
// client SDKs would be speculative abstraction for a provider that
// doesn't exist yet, not a real architectural need.

export type NormalizedSubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "paused"
  | "canceled";

export type SubscriptionEvent = {
  /** From checkout's custom data, when the provider passes it through — null if the caller must resolve it another way (e.g. by external subscription ID). */
  organizationId: string | null;
  externalCustomerId: string;
  externalSubscriptionId: string;
  status: NormalizedSubscriptionStatus;
  /** The subscribed price's ID (first line item) — null if the event carries no items. Maps back to a PlanTier via src/lib/billing/plans.ts's planTierForPriceId. */
  priceId: string | null;
  /** Start of the subscription's current billing cycle, when the provider includes it — null if the event carries no billing-period data. Anchors the "resets every billing period" usage caps (src/lib/billing/usage.ts) rather than a rolling/lifetime window. */
  currentPeriodStart: Date | null;
};

// A discriminated union so a future non-subscription event (e.g. a
// one-off payment) can be added without touching call sites that only
// handle subscription state.
export type PaymentEvent = { kind: "subscription"; data: SubscriptionEvent } | { kind: "ignored" };

export interface PaymentProvider {
  /**
   * Verifies an incoming webhook's signature and parses it into a
   * normalized event. Returns null when the signature is invalid — the
   * caller must treat that as a rejected webhook, never process the body.
   */
  verifyWebhook(rawBody: string, signatureHeader: string | null): Promise<PaymentEvent | null>;

  /** A management URL where a customer can update their payment method, view invoices, or cancel. */
  createCustomerPortalUrl(
    externalCustomerId: string,
    externalSubscriptionId: string | null,
  ): Promise<string>;
}
