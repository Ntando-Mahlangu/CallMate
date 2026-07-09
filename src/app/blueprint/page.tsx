import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/session";
import { getCurrentOrganization } from "@/lib/org";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { ImpactBadge, Badge } from "@/components/ui/badge";
import { ScoreGauge } from "@/components/growth-blueprint/score-gauge";
import type { GrowthBlueprintData } from "@/lib/growth-blueprint/schema";

export default async function BlueprintPage() {
  const session = await getCurrentSession();
  if (!session) redirect("/sign-in");

  const organization = await getCurrentOrganization(session.user.id);
  if (!organization) redirect("/sign-in");
  if (!organization.businessProfile) redirect("/onboarding");

  const blueprint = await prisma.growthBlueprint.findFirst({
    where: { organizationId: organization.id },
    orderBy: { version: "desc" },
  });

  if (!blueprint) redirect("/blueprint/generating");

  const strengths = blueprint.strengths as GrowthBlueprintData["strengths"];
  const weaknesses = blueprint.weaknesses as GrowthBlueprintData["weaknesses"];
  const bottleneck = blueprint.biggestBottleneck as GrowthBlueprintData["biggestBottleneck"];
  const opportunities = blueprint.opportunities as GrowthBlueprintData["opportunities"];
  const growthStrategy = blueprint.growthStrategy as GrowthBlueprintData["growthStrategy"];
  const icp = blueprint.idealCustomerProfile as GrowthBlueprintData["idealCustomerProfile"];
  const roadmap = blueprint.roadmap as GrowthBlueprintData["roadmap"];
  const scoreCategories = blueprint.scoreCategories as GrowthBlueprintData["scoreCategories"];

  const horizons: GrowthBlueprintData["roadmap"][number]["horizon"][] = [
    "Today",
    "This Week",
    "This Month",
    "This Quarter",
  ];

  return (
    <main className="min-h-screen bg-[var(--color-bg-primary)] px-4 py-16">
      <div className="mx-auto max-w-4xl space-y-8">
        <div className="animate-fade-in text-center">
          <h1 className="text-3xl font-light tracking-tight text-[var(--color-text-primary)]">
            Your Growth Blueprint Is Ready.
          </h1>
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">
            {organization.name} · Version {blueprint.version}
          </p>
        </div>

        <Card className="animate-fade-in flex flex-col items-center gap-6 sm:flex-row sm:items-start">
          <ScoreGauge score={blueprint.growthScore} label="Growth Score" />
          <div className="flex-1 space-y-2">
            <h2 className="text-lg font-medium text-[var(--color-text-primary)]">
              Business Summary
            </h2>
            <p className="text-sm leading-relaxed text-[var(--color-text-secondary)]">
              {blueprint.executiveSummary}
            </p>
          </div>
        </Card>

        <div className="grid gap-6 sm:grid-cols-2">
          <Card className="animate-fade-in">
            <h2 className="mb-4 text-lg font-medium text-[var(--color-text-primary)]">
              Strengths
            </h2>
            <ul className="space-y-4">
              {strengths.map((s) => (
                <li key={s.title}>
                  <p className="font-medium text-[var(--color-text-primary)]">{s.title}</p>
                  <p className="text-sm text-[var(--color-text-secondary)]">{s.reason}</p>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="animate-fade-in">
            <h2 className="mb-4 text-lg font-medium text-[var(--color-text-primary)]">
              Weaknesses
            </h2>
            <ul className="space-y-4">
              {weaknesses.map((w) => (
                <li key={w.title}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-[var(--color-text-primary)]">{w.title}</p>
                    <ImpactBadge level={w.estimatedImpact} />
                  </div>
                  <p className="text-sm text-[var(--color-text-secondary)]">
                    {w.whyItMatters}
                  </p>
                  <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                    Fix: {w.suggestedImprovement}
                  </p>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <Card className="animate-fade-in border-[var(--color-accent)]/40">
          <p className="text-xs uppercase tracking-wide text-[var(--color-accent)]">
            Biggest Opportunity
          </p>
          <h2 className="mt-2 text-xl font-light text-[var(--color-text-primary)]">
            {bottleneck.title}
          </h2>
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
            {bottleneck.description}
          </p>
          <p className="mt-3 text-sm text-[var(--color-text-secondary)]">
            <span className="font-medium text-[var(--color-text-primary)]">Why it matters: </span>
            {bottleneck.whyItIsLimitingGrowth}
          </p>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            <span className="font-medium text-[var(--color-text-primary)]">
              Fixing it changes the business by:{" "}
            </span>
            {bottleneck.howFixingItChangesTheBusiness}
          </p>
        </Card>

        <Card className="animate-fade-in">
          <h2 className="mb-4 text-lg font-medium text-[var(--color-text-primary)]">
            Highest ROI Opportunities
          </h2>
          <ul className="space-y-5">
            {opportunities.map((o) => (
              <li
                key={o.title}
                className="border-b border-[var(--color-border)] pb-5 last:border-0 last:pb-0"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-[var(--color-text-primary)]">{o.title}</p>
                  <div className="flex gap-2">
                    <ImpactBadge level={o.estimatedImpact} />
                    <Badge tone="accent">{o.confidence}% confidence</Badge>
                  </div>
                </div>
                <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                  {o.description}
                </p>
                <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                  Evidence: {o.supportingEvidence}
                </p>
                <p className="mt-1 text-sm font-medium text-[var(--color-accent)]">
                  Next step: {o.recommendedAction}
                </p>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="animate-fade-in">
          <h2 className="mb-4 text-lg font-medium text-[var(--color-text-primary)]">
            Recommended Growth Strategy
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {growthStrategy.map((strategy) => (
              <div
                key={strategy.channel}
                className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4"
              >
                <div className="flex items-center justify-between">
                  <p className="font-medium text-[var(--color-text-primary)]">
                    {strategy.channel}
                  </p>
                  <ImpactBadge level={strategy.impact} label={strategy.impact} />
                </div>
                <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
                  {strategy.whyItFits}
                </p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="animate-fade-in">
          <h2 className="mb-4 text-lg font-medium text-[var(--color-text-primary)]">
            Ideal Customer Profile
          </h2>
          <div className="grid gap-4 text-sm sm:grid-cols-2">
            <p>
              <span className="text-[var(--color-text-muted)]">Industry: </span>
              <span className="text-[var(--color-text-primary)]">{icp.industry}</span>
            </p>
            <p>
              <span className="text-[var(--color-text-muted)]">Company size: </span>
              <span className="text-[var(--color-text-primary)]">{icp.companySize}</span>
            </p>
            <p>
              <span className="text-[var(--color-text-muted)]">Decision maker: </span>
              <span className="text-[var(--color-text-primary)]">{icp.decisionMaker}</span>
            </p>
            <p>
              <span className="text-[var(--color-text-muted)]">Location: </span>
              <span className="text-[var(--color-text-primary)]">{icp.location}</span>
            </p>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
                Pain points
              </p>
              <ul className="mt-1 space-y-1 text-sm text-[var(--color-text-secondary)]">
                {icp.painPoints.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
                Likely goals
              </p>
              <ul className="mt-1 space-y-1 text-sm text-[var(--color-text-secondary)]">
                {icp.likelyGoals.map((g) => (
                  <li key={g}>{g}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
                Buying triggers
              </p>
              <ul className="mt-1 space-y-1 text-sm text-[var(--color-text-secondary)]">
                {icp.buyingTriggers.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </div>
          </div>
        </Card>

        <Card className="animate-fade-in">
          <h2 className="mb-4 text-lg font-medium text-[var(--color-text-primary)]">
            Growth Roadmap
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {horizons.map((horizon) => (
              <div key={horizon}>
                <p className="mb-2 text-xs uppercase tracking-wide text-[var(--color-accent)]">
                  {horizon}
                </p>
                <ul className="space-y-3">
                  {roadmap
                    .filter((item) => item.horizon === horizon)
                    .map((item) => (
                      <li
                        key={item.action}
                        className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-3"
                      >
                        <p className="text-sm font-medium text-[var(--color-text-primary)]">
                          {item.action}
                        </p>
                        <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                          {item.reason}
                        </p>
                      </li>
                    ))}
                </ul>
              </div>
            ))}
          </div>
        </Card>

        <Card className="animate-fade-in">
          <h2 className="mb-4 text-lg font-medium text-[var(--color-text-primary)]">
            Score Breakdown
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {scoreCategories.map((c) => (
              <div key={c.category} className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium text-[var(--color-text-primary)]">{c.category}</p>
                  <p className="text-sm text-[var(--color-text-secondary)]">{c.reason}</p>
                </div>
                <p className="shrink-0 text-2xl font-light text-[var(--color-text-primary)]">
                  {c.score}
                </p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="animate-fade-in bg-[var(--color-bg-secondary)]">
          <p className="text-sm text-[var(--color-text-muted)]">
            <span className="font-medium text-[var(--color-text-secondary)]">
              AI confidence notes:{" "}
            </span>
            {blueprint.confidenceNotes}
          </p>
        </Card>
      </div>
    </main>
  );
}
