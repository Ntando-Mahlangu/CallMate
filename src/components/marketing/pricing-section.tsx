import Link from "next/link";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { PLANS } from "@/lib/billing/plans";

export function PricingSection() {
  return (
    <section id="pricing" className="mx-auto max-w-4xl px-6 py-20">
      <h2 className="text-center text-3xl font-light tracking-tight text-[var(--color-text-primary)]">
        Choose Your Growth Partner.
      </h2>
      <div className="mt-12 grid gap-6 sm:grid-cols-2">
        {(["FREE", "STARTER"] as const).map((tier) => {
          const plan = PLANS[tier];
          return (
            <Card key={tier} className={tier === "STARTER" ? "border-[var(--color-accent)]/40" : ""}>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-[var(--color-text-primary)]">
                  {plan.name}
                </h3>
                <span className="text-xl font-light text-[var(--color-text-primary)]">
                  {plan.priceLabel}
                </span>
              </div>
              <ul className="mt-4 space-y-2 text-sm text-[var(--color-text-secondary)]">
                {plan.features.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              <Link
                href="/sign-up"
                className={cn(buttonVariants({ variant: tier === "STARTER" ? "primary" : "secondary" }), "mt-6 w-full")}
              >
                Start Free
              </Link>
            </Card>
          );
        })}
      </div>
      <p className="mt-6 text-center text-sm text-[var(--color-text-muted)]">
        Every plan starts free. Upgrade from inside your dashboard whenever
        you&apos;re ready.
      </p>
    </section>
  );
}
