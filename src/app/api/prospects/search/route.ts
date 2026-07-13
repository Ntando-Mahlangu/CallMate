import { NextRequest, NextResponse } from "next/server";
import { UsageEventType } from "@prisma/client";
import { getCurrentSession } from "@/lib/session";
import { getCurrentOrganization } from "@/lib/org";
import { prisma } from "@/lib/prisma";
import { getCompanyDataProvider } from "@/lib/leads";
import { scoreCompany } from "@/lib/leads/scoring";
import { checkAndRecordUsage } from "@/lib/billing/usage";
import { logEvent, EventType } from "@/lib/memory/log-event";
import { UserFacingError } from "@/lib/errors";
import type { GrowthBlueprintData } from "@/lib/growth-blueprint/schema";

const GENERIC_ERROR =
  "We couldn't complete that search right now. Please try again in a moment.";

export async function POST(request: NextRequest) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const organization = await getCurrentOrganization(session.user.id);
  if (!organization) {
    return NextResponse.json(
      { error: "No workspace found for this account." },
      { status: 404 },
    );
  }

  const { query } = await request.json();
  if (typeof query !== "string" || query.trim().length < 3) {
    return NextResponse.json(
      { error: "Describe who you're looking for — e.g. \"plumbers in Austin, Texas\"." },
      { status: 400 },
    );
  }

  try {
    await checkAndRecordUsage(organization.id, UsageEventType.COMPANY_SEARCH);

    const provider = getCompanyDataProvider();
    const results = await provider.search(query.trim());

    const latestBlueprint = await prisma.growthBlueprint.findFirst({
      where: { organizationId: organization.id },
      orderBy: { version: "desc" },
      select: { idealCustomerProfile: true },
    });
    const icp = (latestBlueprint?.idealCustomerProfile ??
      null) as GrowthBlueprintData["idealCustomerProfile"] | null;

    const companies = await Promise.all(
      results.map((result) => {
        const score = scoreCompany(result, icp);
        return prisma.company.upsert({
          where: {
            organizationId_source_sourceId: {
              organizationId: organization.id,
              source: result.source,
              sourceId: result.sourceId,
            },
          },
          create: {
            organizationId: organization.id,
            source: result.source,
            sourceId: result.sourceId,
            name: result.name,
            category: result.category,
            website: result.website,
            phone: result.phone,
            formattedAddress: result.formattedAddress,
            rating: result.rating,
            reviewCount: result.reviewCount,
            fitScore: score.fitScore,
            confidenceScore: score.confidenceScore,
          },
          update: {
            name: result.name,
            category: result.category,
            website: result.website,
            phone: result.phone,
            formattedAddress: result.formattedAddress,
            rating: result.rating,
            reviewCount: result.reviewCount,
            fitScore: score.fitScore,
            confidenceScore: score.confidenceScore,
          },
        });
      }),
    );

    companies.sort((a, b) => (b.fitScore ?? 0) - (a.fitScore ?? 0));

    await logEvent(
      organization.id,
      EventType.COMPANY_SEARCHED,
      `Searched "${query.trim()}" — ${companies.length} result${companies.length === 1 ? "" : "s"}.`,
    );

    return NextResponse.json({ companies });
  } catch (error) {
    if (error instanceof UserFacingError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Company search failed:", error);
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 502 });
  }
}
