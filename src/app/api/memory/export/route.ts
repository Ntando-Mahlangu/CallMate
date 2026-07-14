import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/session";
import { getCurrentOrganization } from "@/lib/org";
import { prisma } from "@/lib/prisma";
import { RateLimitError } from "@/lib/errors";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

// docs/outrun/08 Privacy — "Allow users to view, edit, delete, export memory."
export async function GET() {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const organization = await getCurrentOrganization(session.user.id);
  if (!organization) {
    return NextResponse.json({ error: "No workspace found." }, { status: 404 });
  }

  try {
    await checkRateLimit(
      `export:${organization.id}`,
      RATE_LIMITS.EXPORT.limit,
      RATE_LIMITS.EXPORT.windowSeconds,
    );
  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json({ error: error.message }, { status: 429 });
    }
    throw error;
  }

  const [businessProfile, blueprints, campaigns, companies, events] = await Promise.all([
    prisma.businessProfile.findUnique({ where: { organizationId: organization.id } }),
    prisma.growthBlueprint.findMany({ where: { organizationId: organization.id } }),
    prisma.campaign.findMany({
      where: { organizationId: organization.id },
      include: { messages: true },
    }),
    prisma.company.findMany({ where: { organizationId: organization.id } }),
    prisma.event.findMany({ where: { organizationId: organization.id } }),
  ]);

  const exportData = {
    exportedAt: new Date().toISOString(),
    organization: {
      name: organization.name,
      website: organization.website,
      industry: organization.industry,
      growthStage: organization.growthStage,
      planTier: organization.planTier,
    },
    businessProfile,
    growthBlueprints: blueprints,
    campaigns,
    companies,
    events,
  };

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="outrun-export-${organization.id}.json"`,
    },
  });
}
