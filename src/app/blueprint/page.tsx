import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/session";
import { getCurrentOrganization } from "@/lib/org";
import { prisma } from "@/lib/prisma";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import Link from "next/link";
import { BlueprintView } from "@/components/growth-blueprint/blueprint-view";
import { BlueprintActions } from "@/components/growth-blueprint/blueprint-actions";
import { isFeatureEnabled, FEATURE_FLAGS } from "@/lib/billing/feature-flags";
import type { GrowthBlueprintData } from "@/lib/growth-blueprint/schema";

export default async function BlueprintPage() {
  const session = await getCurrentSession();
  if (!session) redirect("/sign-in");

  const organization = await getCurrentOrganization(session.user.id);
  if (!organization) redirect("/sign-in");
  if (!organization.businessProfile) redirect("/onboarding");

  const [blueprint, versionCount] = await Promise.all([
    prisma.growthBlueprint.findFirst({
      where: { organizationId: organization.id },
      orderBy: { version: "desc" },
    }),
    prisma.growthBlueprint.count({ where: { organizationId: organization.id } }),
  ]);

  if (!blueprint) redirect("/blueprint/generating");

  return (
    <main className="min-h-screen bg-[var(--color-bg-primary)] px-4 py-16 print:bg-white print:px-0 print:py-0">
      <div className="mx-auto max-w-4xl space-y-8">
        <div className="print:hidden">
          <BlueprintActions
            hasHistory={versionCount > 1}
            canExport={isFeatureEnabled(organization.planTier, FEATURE_FLAGS.GROWTH_BLUEPRINT_EXPORT)}
            initialShareEnabled={organization.blueprintShareEnabled}
            initialShareToken={organization.blueprintShareToken}
          />
        </div>

        <BlueprintView
          organizationName={organization.name}
          blueprint={{
            version: blueprint.version,
            growthScore: blueprint.growthScore,
            executiveSummary: blueprint.executiveSummary,
            confidenceNotes: blueprint.confidenceNotes,
            strengths: blueprint.strengths as GrowthBlueprintData["strengths"],
            weaknesses: blueprint.weaknesses as GrowthBlueprintData["weaknesses"],
            biggestBottleneck: blueprint.biggestBottleneck as GrowthBlueprintData["biggestBottleneck"],
            opportunities: blueprint.opportunities as GrowthBlueprintData["opportunities"],
            growthStrategy: blueprint.growthStrategy as GrowthBlueprintData["growthStrategy"],
            idealCustomerProfile:
              blueprint.idealCustomerProfile as GrowthBlueprintData["idealCustomerProfile"],
            roadmap: blueprint.roadmap as GrowthBlueprintData["roadmap"],
            scoreCategories: blueprint.scoreCategories as GrowthBlueprintData["scoreCategories"],
          }}
        />

        <div className="flex justify-center pb-8 print:hidden">
          <Link href="/dashboard" className={cn(buttonVariants({ size: "lg" }))}>
            Continue to Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
