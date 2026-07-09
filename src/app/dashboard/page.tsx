import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentSession } from "@/lib/session";
import { getCurrentOrganization } from "@/lib/org";
import { prisma } from "@/lib/prisma";
import { getTodaysMission } from "@/lib/dashboard/mission";
import { Card } from "@/components/ui/card";
import { ImpactBadge } from "@/components/ui/badge";
import { ScoreGauge } from "@/components/growth-blueprint/score-gauge";
import { EvidenceToggle } from "@/components/dashboard/evidence-toggle";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import type { GrowthBlueprintData } from "@/lib/growth-blueprint/schema";

function greeting(date: Date) {
  const hour = date.getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 18) return "Good Afternoon";
  return "Good Evening";
}

export default async function DashboardPage() {
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

  const mission = getTodaysMission(blueprint);
  const scoreCategories = blueprint.scoreCategories as GrowthBlueprintData["scoreCategories"];
  const opportunities = (
    blueprint.opportunities as GrowthBlueprintData["opportunities"]
  ).slice(0, 3);

  const firstName = session.user.name.split(" ")[0];
  const today = new Date();

  return (
    <div className="animate-fade-in space-y-8">
      <div>
        <h1 className="text-2xl font-light tracking-tight text-[var(--color-text-primary)]">
          {greeting(today)}, {firstName}.
        </h1>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          Here&apos;s what will help {organization.name} grow today.
        </p>
      </div>

      {mission && (
        <Card className="border-[var(--color-accent)]/40">
          <p className="text-xs uppercase tracking-wide text-[var(--color-accent)]">
            Today&apos;s Mission
          </p>
          <h2 className="mt-2 text-xl font-light text-[var(--color-text-primary)]">
            {mission.action}
          </h2>

          <div className="mt-4 flex flex-wrap gap-4 text-sm text-[var(--color-text-secondary)]">
            {mission.estimatedTime && (
              <span>
                <span className="text-[var(--color-text-muted)]">Estimated time: </span>
                {mission.estimatedTime}
              </span>
            )}
            {mission.confidence != null && (
              <span>
                <span className="text-[var(--color-text-muted)]">Confidence: </span>
                {mission.confidence}%
              </span>
            )}
          </div>

          <div className="mt-4 flex items-center gap-3">
            <ImpactBadge level={mission.expectedImpact} label={`${mission.expectedImpact} impact`} />
          </div>

          <div className="mt-4">
            <EvidenceToggle reason={mission.reason} />
          </div>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-[auto_1fr]">
        <Card className="flex flex-col items-center justify-center">
          <ScoreGauge score={blueprint.growthScore} label="Growth Score" />
        </Card>

        <Card>
          <h2 className="mb-4 text-lg font-medium text-[var(--color-text-primary)]">
            Score Breakdown
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {scoreCategories.map((c) => (
              <div key={c.category} className="flex items-center justify-between gap-3">
                <span className="text-sm text-[var(--color-text-secondary)]">
                  {c.category}
                </span>
                <span className="text-sm font-medium text-[var(--color-text-primary)]">
                  {c.score}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-medium text-[var(--color-text-primary)]">
            AI Opportunities
          </h2>
          <Link
            href="/blueprint"
            className="text-sm text-[var(--color-accent)] hover:underline"
          >
            View all
          </Link>
        </div>
        <ul className="space-y-4">
          {opportunities.map((o) => (
            <li
              key={o.title}
              className="border-b border-[var(--color-border)] pb-4 last:border-0 last:pb-0"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium text-[var(--color-text-primary)]">{o.title}</p>
                <ImpactBadge level={o.priority} label={`${o.priority} priority`} />
              </div>
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                {o.description}
              </p>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <h2 className="mb-4 text-lg font-medium text-[var(--color-text-primary)]">
          Business Snapshot
        </h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
              Plan
            </p>
            <p className="text-sm text-[var(--color-text-primary)]">{organization.planTier}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
              Stage
            </p>
            <p className="text-sm text-[var(--color-text-primary)]">
              {organization.growthStage ?? "Not set"}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
              Main goal
            </p>
            <p className="text-sm text-[var(--color-text-primary)]">
              {organization.businessProfile?.mainGoal}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
              Blueprint version
            </p>
            <p className="text-sm text-[var(--color-text-primary)]">{blueprint.version}</p>
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="mb-4 text-lg font-medium text-[var(--color-text-primary)]">
          Quick Actions
        </h2>
        <div className="flex flex-wrap gap-3">
          <Link href="/blueprint" className={cn(buttonVariants({ variant: "secondary" }))}>
            View Growth Blueprint
          </Link>
          <Link
            href="/blueprint/generating"
            className={cn(buttonVariants({ variant: "secondary" }))}
          >
            Update Growth Blueprint
          </Link>
        </div>
        <p className="mt-3 text-xs text-[var(--color-text-muted)]">
          Prospect discovery, outreach, and campaigns unlock in the next build
          phase.
        </p>
      </Card>
    </div>
  );
}
