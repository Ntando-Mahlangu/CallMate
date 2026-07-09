import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/session";
import { getCurrentOrganization } from "@/lib/org";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PLANS, planLabel } from "@/lib/billing/plans";
import { CheckoutButton } from "@/components/billing/checkout-button";
import { ManageBillingButton } from "@/components/billing/manage-billing-button";

export default async function BillingPage() {
  const session = await getCurrentSession();
  if (!session) redirect("/sign-in");

  const organization = await getCurrentOrganization(session.user.id);
  if (!organization) redirect("/sign-in");

  const isSubscribed = organization.planTier !== "FREE";
  const starterPriceId = PLANS.STARTER.paddlePriceId;
  const checkoutConfigured = Boolean(
    starterPriceId && process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN,
  );

  return (
    <div className="animate-fade-in space-y-8">
      <div>
        <h1 className="text-2xl font-light tracking-tight text-[var(--color-text-primary)]">
          Billing
        </h1>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          Choose your Growth Partner.
        </p>
      </div>

      <Card>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
              Current Plan
            </p>
            <p className="text-xl font-light text-[var(--color-text-primary)]">
              {planLabel(organization.planTier)}
            </p>
          </div>
          {organization.subscriptionStatus && (
            <Badge tone={organization.subscriptionStatus === "active" ? "high" : "medium"}>
              {organization.subscriptionStatus}
            </Badge>
          )}
        </div>

        {isSubscribed && (
          <div className="mt-4">
            <ManageBillingButton />
          </div>
        )}
      </Card>

      <div className="grid gap-6 sm:grid-cols-2">
        {(["FREE", "STARTER"] as const).map((tier) => {
          const plan = PLANS[tier];
          const isCurrent = organization.planTier === tier;

          return (
            <Card key={tier} className={isCurrent ? "border-[var(--color-accent)]/40" : ""}>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium text-[var(--color-text-primary)]">
                  {plan.name}
                </h2>
                <span className="text-lg font-light text-[var(--color-text-primary)]">
                  {plan.priceLabel}
                </span>
              </div>
              <ul className="mt-4 space-y-2 text-sm text-[var(--color-text-secondary)]">
                {plan.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>

              <div className="mt-6">
                {isCurrent ? (
                  <Badge tone="accent">Current plan</Badge>
                ) : tier === "STARTER" ? (
                  checkoutConfigured ? (
                    <CheckoutButton
                      priceId={starterPriceId!}
                      organizationId={organization.id}
                    />
                  ) : (
                    <p className="text-xs text-[var(--color-text-muted)]">
                      Upgrades open here once billing is configured.
                    </p>
                  )
                ) : null}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
