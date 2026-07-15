import type { PlanTier } from "@prisma/client";

// docs/outrun/14 — only Free and Starter are wired up in this build phase.
// Growth/Unlimited stay defined in the PlanTier enum for forward
// compatibility but have no Paddle price yet; add one and a card here when
// they're ready to sell.
export const PLANS: Record<
  "FREE" | "STARTER",
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
};

export function planLabel(tier: PlanTier): string {
  return PLANS[tier as "FREE" | "STARTER"]?.name ?? tier;
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
