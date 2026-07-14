import { prisma } from "@/lib/prisma";
import type { GrowthBlueprintData } from "./schema";

type ScoreCategories = GrowthBlueprintData["scoreCategories"];

function diffCategories(previous: ScoreCategories, current: ScoreCategories) {
  return current
    .map((c) => {
      const prev = previous.find((p) => p.category === c.category);
      return prev && prev.score !== c.score
        ? { category: c.category, from: prev.score, to: c.score, delta: c.score - prev.score }
        : null;
    })
    .filter((d): d is NonNullable<typeof d> => d !== null);
}

/**
 * docs/outrun/05 "VERSION HISTORY" — score changes plus the actual
 * Business Brain events logged between two versions, so a change is
 * shown alongside real evidence of what happened (e.g. a campaign
 * launched) rather than an invented causal narrative the AI can't
 * actually verify.
 */
export async function getBlueprintHistory(organizationId: string) {
  const versions = await prisma.growthBlueprint.findMany({
    where: { organizationId },
    orderBy: { version: "asc" },
    select: { version: true, growthScore: true, scoreCategories: true, createdAt: true },
  });
  if (versions.length === 0) return [];

  const events = await prisma.event.findMany({
    where: { organizationId },
    orderBy: { createdAt: "asc" },
  });

  return versions
    .map((current, i) => {
      const previous = versions[i - 1];
      const categoryDeltas = previous
        ? diffCategories(
            previous.scoreCategories as ScoreCategories,
            current.scoreCategories as ScoreCategories,
          )
        : [];
      const eventsSince = previous
        ? events.filter((e) => e.createdAt > previous.createdAt && e.createdAt <= current.createdAt)
        : [];

      return {
        version: current.version,
        growthScore: current.growthScore,
        previousGrowthScore: previous?.growthScore ?? null,
        createdAt: current.createdAt,
        categoryDeltas,
        eventsSince,
      };
    })
    .reverse();
}
