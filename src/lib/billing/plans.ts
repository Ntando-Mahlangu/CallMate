import type { PlanTier } from "@prisma/client";

// docs/outrun/14 — only Free and Starter have a real Paddle price today;
// every organization is created on Free and Starter is the only paid tier
// actually purchasable from src/app/(app)/billing/page.tsx (it only renders
// a CheckoutButton for HIGHLIGHTED_TIER). Growth and Unlimited are
// described here — and shown on the marketing pricing table — with a
// `paddlePriceId: null` because docs/outrun/02 requires all four tiers to
// be presented, but neither can be checked out yet: the billing page
// already renders no action for a tier with no price ID, so adding them
// here doesn't create a broken buy button, just an honest "not sold yet"
// plan card.
export const PLANS: Record<
  PlanTier,
  {
    name: string;
    priceLabel: string;
    features: string[];
    paddlePriceId: string | null;
  }
> = {
  FREE: {
    name: "Free",
    priceLabel: "$0",
    features: [
      "1 Growth Blueprint",
      "10 company searches",
      "5 AI company reports",
      "5 outreach generations",
      "1 campaign",
    ],
    paddlePriceId: null,
  },
  STARTER: {
    name: "Starter",
    priceLabel: "$49/month",
    features: [
      "Unlimited Growth Blueprints",
      "250 company searches",
      "250 AI company reports",
      "500 AI outreach generations",
      "SEO Engine",
      "Growth Blueprint exports",
    ],
    paddlePriceId: process.env.NEXT_PUBLIC_PADDLE_STARTER_PRICE_ID ?? null,
  },
  GROWTH: {
    name: "Growth",
    priceLabel: "$149/month",
    features: [
      "Everything in Starter",
      "More usage across searches, reports, and outreach",
      "Team collaboration",
      "Priority AI processing",
      "Advanced recommendations",
      "Integrations",
      "Priority support",
    ],
    paddlePriceId: null,
  },
  UNLIMITED: {
    name: "Unlimited",
    priceLabel: "$499/month",
    features: [
      "Unlimited Growth Blueprints",
      "Unlimited prospect searches",
      "Unlimited campaigns and outreach generation",
      "Unlimited saved businesses and workspaces",
      "Unlimited team members",
      "Premium AI models",
      "Priority infrastructure",
      "API access",
      "Dedicated onboarding",
    ],
    paddlePriceId: null,
  },
};

export function planLabel(tier: PlanTier): string {
  return PLANS[tier]?.name ?? tier;
}

// The one place that defines "has a paid subscription" — every other
// call site should check this instead of comparing `planTier === "FREE"`
// directly, so a future tier still counts as paid without needing a
// second edit (docs/outrun/14 "FEATURE GATING" — "Never hard-code plan
// names").
export function isPaidPlan(tier: PlanTier): boolean {
  return tier !== "FREE";
}

// The tier whose card gets the accent border / primary CTA on pricing
// pages — centralized so adding a tier above Starter doesn't require
// re-deciding this in three components.
export const HIGHLIGHTED_TIER: keyof typeof PLANS = "STARTER";
