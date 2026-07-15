import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { PLANS } from "@/lib/billing/plans";

// docs/outrun/02 puts "Most Popular" on Growth and a display badge on
// Unlimited — a purely cosmetic marketing distinction. It's separate from
// src/lib/billing/plans.ts's HIGHLIGHTED_TIER, which governs which tier
// actually gets a checkout button on the Billing page (still Starter —
// Growth/Unlimited have no Paddle price yet).
const MARKETING_BADGE: Partial<Record<keyof typeof PLANS, string>> = {
  GROWTH: "Most Popular",
  UNLIMITED: "Best for businesses serious about growth",
};

const TIER_ORDER: (keyof typeof PLANS)[] = ["FREE", "STARTER", "GROWTH", "UNLIMITED"];

export function PricingSection() {
  return (
    <section id="pricing" className="mx-auto max-w-6xl px-6 py-20">
      <h2 className="text-center text-3xl font-light tracking-tight text-[var(--color-text-primary)]">
        Choose Your Growth Partner.
      </h2>
      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {TIER_ORDER.map((tier) => {
          const plan = PLANS[tier];
          const badge = MARKETING_BADGE[tier];
          return (
            <Card key={tier} className={badge ? "border-[var(--color-accent)]/40" : ""}>
              {badge && (
                <Badge tone="accent" className="mb-3">
                  {badge}
                </Badge>
              )}
              <h3 className="text-lg font-medium text-[var(--color-text-primary)]">
                {plan.name}
              </h3>
              <p className="mt-1 text-xl font-light text-[var(--color-text-primary)]">
                {plan.priceLabel}
              </p>
              <ul className="mt-4 space-y-2 text-sm text-[var(--color-text-secondary)]">
                {plan.features.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              <Link
                href="/sign-up"
                className={cn(
                  buttonVariants({ variant: badge ? "primary" : "secondary" }),
                  "mt-6 w-full",
                )}
              >
                Start Free
              </Link>
            </Card>
          );
        })}
      </div>
      <p className="mt-6 text-center text-sm text-[var(--color-text-muted)]">
        Every plan starts free. Upgrade from inside your dashboard whenever
        you&apos;re ready — Outrun will always tell you exactly how many more
        qualified prospects are waiting once you hit a limit.
      </p>
    </section>
  );
}
