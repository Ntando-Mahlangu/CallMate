import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/session";
import { getCurrentOrganization, getMembershipFor } from "@/lib/org";
import { canManageBilling } from "@/lib/teams/permissions";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import { PLANS, planLabel, isPaidPlan, HIGHLIGHTED_TIER } from "@/lib/billing/plans";
import { getUsageSummary } from "@/lib/billing/usage";
import { getRefundRequestsForOrg } from "@/lib/billing/refunds";
import { CheckoutButton } from "@/components/billing/checkout-button";
import { ManageBillingButton } from "@/components/billing/manage-billing-button";
import { RefundRequestPanel } from "@/components/billing/refund-request-panel";

const USAGE_LABELS: Record<string, string> = {
  COMPANY_SEARCH: "Company searches",
  COMPANY_RESEARCH: "AI company reports",
  OUTREACH_GENERATION: "Outreach generations",
  BLUEPRINT_GENERATION: "Growth Blueprints",
  CALL_SCRIPT_GENERATION: "Call scripts",
};

export default async function BillingPage() {
  const session = await getCurrentSession();
  if (!session) redirect("/sign-in");

  const organization = await getCurrentOrganization(session.user.id);
  if (!organization) redirect("/sign-in");

  const membership = await getMembershipFor(session.user.id, organization.id);

  const isSubscribed = isPaidPlan(organization.planTier);
  const starterPriceId = PLANS.STARTER.paddlePriceId;
  const checkoutConfigured = Boolean(
    starterPriceId && process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN,
  );
  const usage = await getUsageSummary(organization.id, organization.planTier);
  const refundRequests = isSubscribed ? await getRefundRequestsForOrg(organization.id) : [];

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

      <Card>
        <h2 className="mb-4 text-lg font-medium text-[var(--color-text-primary)]">
          Usage
        </h2>
        <div className="space-y-4">
          {usage.map(({ type, used, limit }) => (
            <div key={type}>
              <div className="mb-1.5 flex items-center justify-between text-sm">
                <span className="text-[var(--color-text-secondary)]">
                  {USAGE_LABELS[type]}
                </span>
                <span className="tabular-nums text-[var(--color-text-muted)]">
                  {used} {limit != null ? `/ ${limit}` : "· Unlimited"}
                </span>
              </div>
              {limit != null && <ProgressBar value={(used / limit) * 100} />}
            </div>
          ))}
        </div>
      </Card>

      <div className="grid gap-6 sm:grid-cols-2">
        {(Object.keys(PLANS) as (keyof typeof PLANS)[]).map((tier) => {
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
                ) : tier === HIGHLIGHTED_TIER ? (
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

      {isSubscribed && (
        <Card>
          <h2 className="mb-4 text-lg font-medium text-[var(--color-text-primary)]">
            Refund Requests
          </h2>
          <RefundRequestPanel
            canManage={Boolean(membership && canManageBilling(membership.role))}
            initialRequests={refundRequests}
          />
        </Card>
      )}
    </div>
  );
}
