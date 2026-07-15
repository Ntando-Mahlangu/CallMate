import { prisma } from "@/lib/prisma";
import * as campaignRepository from "@/lib/repositories/campaign-repository";
import * as companyRepository from "@/lib/repositories/company-repository";
import * as growthBlueprintRepository from "@/lib/repositories/growth-blueprint-repository";
import type { GrowthBlueprintData } from "@/lib/growth-blueprint/schema";

/**
 * The Business Brain's retrieval layer (docs/outrun/08 "MEMORY RETRIEVAL" —
 * "Whenever the AI answers a question, retrieve relevant context first").
 * Gathers everything already stored in Postgres into one object; no
 * separate vector store or knowledge graph exists yet, but every AI
 * feature that needs cross-cutting context reads through this one place.
 */
export async function getBusinessContext(organizationId: string) {
  const [organization, latestBlueprint, campaigns, companyStats, recentEvents, activeGoals] =
    await Promise.all([
      prisma.organization.findUniqueOrThrow({
        where: { id: organizationId },
        include: { businessProfile: true },
      }),
      growthBlueprintRepository.findLatestForOrg(organizationId),
      campaignRepository.findRecentForOrg(organizationId, 5),
      companyRepository.countForOrg(organizationId),
      prisma.event.findMany({
        where: { organizationId },
        orderBy: { createdAt: "desc" },
        take: 15,
      }),
      prisma.goal.findMany({
        where: { organizationId, status: "ACTIVE" },
        orderBy: { createdAt: "asc" },
      }),
    ]);

  const researchedCount = await companyRepository.countResearchedForOrg(organizationId);

  return {
    organization,
    businessProfile: organization.businessProfile,
    blueprint: latestBlueprint,
    campaigns,
    companyStats: { total: companyStats._count.id, researched: researchedCount },
    recentEvents,
    activeGoals,
  };
}

export type BusinessContext = Awaited<ReturnType<typeof getBusinessContext>>;

/** Renders the context as plain text for an AI system/user message. */
export function formatBusinessContext(context: BusinessContext): string {
  const lines: string[] = [];

  lines.push(`Business: ${context.organization.name}`);
  if (context.businessProfile) {
    lines.push(`What they do: ${context.businessProfile.description}`);
    lines.push(`Ideal customer: ${context.businessProfile.idealCustomer}`);
    lines.push(`Main goal: ${context.businessProfile.mainGoal}`);
    lines.push(`Biggest growth challenge (self-reported): ${context.businessProfile.growthChallenge}`);
  } else {
    lines.push("Business Discovery has not been completed yet.");
  }

  if (context.blueprint) {
    const bottleneck = context.blueprint.biggestBottleneck as GrowthBlueprintData["biggestBottleneck"];
    const opportunities = context.blueprint.opportunities as GrowthBlueprintData["opportunities"];
    lines.push(`Growth Score: ${context.blueprint.growthScore}/100 (Blueprint v${context.blueprint.version})`);
    lines.push(`Executive summary: ${context.blueprint.executiveSummary}`);
    lines.push(`Biggest bottleneck: ${bottleneck.title} — ${bottleneck.description}`);
    lines.push(
      `Top opportunities: ${opportunities
        .slice(0, 3)
        .map((o) => `${o.title} (${o.priority} priority, ${o.confidence}% confidence)`)
        .join("; ")}`,
    );
  } else {
    lines.push("No Growth Blueprint has been generated yet.");
  }

  lines.push(
    `Campaigns: ${context.campaigns.length === 0 ? "none yet" : context.campaigns.map((c) => `"${c.name}" (${c.status}, ${c._count.messages} messages)`).join("; ")}`,
  );
  lines.push(
    `Prospects: ${context.companyStats.total} found, ${context.companyStats.researched} researched.`,
  );

  // docs/outrun/10 "GOAL MANAGEMENT" — "Every recommendation should align
  // with active goals. Never recommend actions unrelated to the user's
  // objectives."
  if (context.activeGoals.length > 0) {
    lines.push(
      `Active goals (align every recommendation with these): ${context.activeGoals
        .map((g) =>
          g.targetMetric && g.targetValue != null
            ? `${g.title} (${g.currentValue ?? 0}/${g.targetValue} ${g.targetMetric})`
            : g.title,
        )
        .join("; ")}`,
    );
  }

  if (context.recentEvents.length > 0) {
    lines.push("Recent activity:");
    for (const event of context.recentEvents.slice(0, 8)) {
      lines.push(`- ${event.summary}`);
    }
  }

  return lines.join("\n");
}
