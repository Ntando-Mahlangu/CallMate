import type { GrowthBlueprint } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { captureError } from "@/lib/observability";
import type { GrowthBlueprintData } from "@/lib/growth-blueprint/schema";

/**
 * docs/outrun/12 "TASK MODEL" — "Every recommendation becomes an optional
 * task." Persists each roadmap item from a freshly generated Growth
 * Blueprint as a completable Task row, so recommendations survive past
 * the single ephemeral "Today's Mission" derived at render time
 * (src/lib/dashboard/mission.ts, left unchanged — it still answers "what's
 * the one next thing"; this answers "what's the whole list and what's
 * done"). Never throws — a failure here must never undo the Blueprint
 * that was just generated.
 */
export async function createTasksFromBlueprint(blueprint: GrowthBlueprint) {
  try {
    const roadmap = blueprint.roadmap as GrowthBlueprintData["roadmap"];
    await prisma.task.createMany({
      data: roadmap.map((item) => ({
        organizationId: blueprint.organizationId,
        title: item.action,
        description: item.reason,
        impact: item.expectedImpact,
        effort: item.estimatedTime,
        sourceBlueprintVersion: blueprint.version,
      })),
    });
  } catch (error) {
    captureError("tasks.generate-from-blueprint", error, {
      organizationId: blueprint.organizationId,
      blueprintId: blueprint.id,
    });
  }
}
