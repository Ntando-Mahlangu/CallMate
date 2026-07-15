import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentSession } from "@/lib/session";
import { getCurrentOrganization } from "@/lib/org";
import { findLatestForOrg } from "@/lib/repositories/growth-blueprint-repository";
import { getTodaysMission, getMissionActionHref } from "@/lib/dashboard/mission";
import { getBusinessHealth } from "@/lib/ceo-agent/health";
import { getBiggestWinThisWeek } from "@/lib/ceo-agent/weekly-win";
import { getRisksAndOpportunities } from "@/lib/ceo-agent/risks";
import { Card } from "@/components/ui/card";
import { ImpactBadge } from "@/components/ui/badge";
import { ScoreGauge } from "@/components/growth-blueprint/score-gauge";
import { EvidenceToggle } from "@/components/dashboard/evidence-toggle";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import type { GrowthBlueprintData } from "@/lib/growth-blueprint/schema";

function formatTrend(trend: number | null): string | null {
  if (trend === null || trend === 0) return null;
  return trend > 0 ? `+${trend}` : `${trend}`;
}

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

  const blueprint = await findLatestForOrg(organization.id);
  if (!blueprint) redirect("/blueprint/generating");

  const mission = getTodaysMission(blueprint);
  const allOpportunities = blueprint.opportunities as GrowthBlueprintData["opportunities"];
  const opportunities = allOpportunities.slice(0, 3);

  const [health, biggestWin, risks] = await Promise.all([
    getBusinessHealth(organization.id),
    getBiggestWinThisWeek(organization.id),
    getRisksAndOpportunities(organization.id),
  ]);
  const healthTrendLabel = health ? formatTrend(health.overallTrend) : null;

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
            Today&apos;s Priority
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

          <div className="mt-5 grid grid-cols-2 gap-4 border-t border-[var(--color-border)] pt-5 sm:grid-cols-4">
            {health && (
              <div>
                <p className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
                  Business Health
                </p>
                <p className="text-sm text-[var(--color-text-primary)]">
                  {health.overall}/100
                  {healthTrendLabel && (
                    <span className="ml-1 text-xs text-[var(--color-text-muted)]">
                      ({healthTrendLabel})
                    </span>
                  )}
                </p>
              </div>
            )}
            <div>
              <p className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
                New Opportunities
              </p>
              <p className="text-sm text-[var(--color-text-primary)]">{allOpportunities.length}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
                Potential Risks
              </p>
              <p className="text-sm text-[var(--color-text-primary)]">{risks.length}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
                Biggest Win This Week
              </p>
              <p className="text-sm text-[var(--color-text-primary)]">
                {biggestWin ?? "Nothing major to report yet"}
              </p>
            </div>
          </div>

          <div className="mt-5">
            <Link
              href={getMissionActionHref(mission)}
              className={cn(buttonVariants({ size: "lg" }))}
            >
              Start Today&apos;s Mission
            </Link>
          </div>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-[auto_1fr]">
        <Card className="flex flex-col items-center justify-center">
          <ScoreGauge score={blueprint.growthScore} label="Growth Score" />
        </Card>

        <Card>
          <h2 className="mb-4 text-lg font-medium text-[var(--color-text-primary)]">
            Business Health Score
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {health?.categories.map((c) => {
              const trendLabel = formatTrend(c.trend);
              return (
                <div
                  key={c.category}
                  className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium text-[var(--color-text-primary)]">
                      {c.category}
                    </span>
                    <span className="text-sm text-[var(--color-text-primary)]">
                      {c.score}
                      {trendLabel && (
                        <span className="ml-1 text-xs text-[var(--color-text-muted)]">
                          ({trendLabel})
                        </span>
                      )}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-[var(--color-text-secondary)]">{c.status}</p>
                  {c.mainIssue && (
                    <p className="mt-1 text-xs text-[var(--color-warning)]">
                      Main issue: {c.mainIssue}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                    Fastest improvement: {c.fastestImprovement}
                  </p>
                </div>
              );
            })}
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
          <Link href="/prospects" className={cn(buttonVariants({ variant: "secondary" }))}>
            Find Prospects
          </Link>
          <Link href="/campaigns" className={cn(buttonVariants({ variant: "secondary" }))}>
            View Campaigns
          </Link>
          <Link href="/tasks" className={cn(buttonVariants({ variant: "secondary" }))}>
            Growth Tasks
          </Link>
          <Link href="/goals" className={cn(buttonVariants({ variant: "secondary" }))}>
            Goals
          </Link>
        </div>
      </Card>
    </div>
  );
}
