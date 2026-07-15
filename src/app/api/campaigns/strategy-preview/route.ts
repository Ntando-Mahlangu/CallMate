import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/session";
import { getCurrentOrganization } from "@/lib/org";
import { prisma } from "@/lib/prisma";
import { generateCampaignStrategy } from "@/lib/campaigns/strategy";
import { getAudienceWarnings } from "@/lib/campaigns/smart-warnings";
import { UserFacingError, RateLimitError } from "@/lib/errors";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { captureError } from "@/lib/observability";
import * as companyRepository from "@/lib/repositories/company-repository";

const GENERIC_ERROR =
  "We couldn't put together a strategy right now. Please try again in a moment.";

// docs/outrun/07 STEP 3 "AI CAMPAIGN STRATEGY" — a standalone preview
// call so the user reviews the audience/channel/confidence before any
// outreach is generated (STEP 5), instead of the two being one
// unreviewable atomic action.
export async function POST(request: NextRequest) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const organization = await getCurrentOrganization(session.user.id);
  if (!organization) {
    return NextResponse.json({ error: "No workspace found for this account." }, { status: 404 });
  }

  const { objective, companyIds } = await request.json();
  if (typeof objective !== "string" || !objective.trim()) {
    return NextResponse.json({ error: "Choose a campaign objective." }, { status: 400 });
  }
  if (!Array.isArray(companyIds) || companyIds.length === 0) {
    return NextResponse.json(
      { error: "Select at least one prospect for this campaign." },
      { status: 400 },
    );
  }

  try {
    await checkRateLimit(`ai:${organization.id}`, RATE_LIMITS.AI.limit, RATE_LIMITS.AI.windowSeconds);

    const businessProfile = await prisma.businessProfile.findUnique({
      where: { organizationId: organization.id },
    });
    if (!businessProfile) {
      throw new UserFacingError("Finish Business Discovery before building a campaign.");
    }

    const companies = await companyRepository.findManyByIdsForOrgWithResearch(
      organization.id,
      companyIds,
    );
    if (companies.length === 0) {
      throw new UserFacingError(
        "Select at least one researched prospect to build a campaign around.",
      );
    }

    const strategy = await generateCampaignStrategy({
      objective: objective.trim(),
      businessDescription: businessProfile.description,
      idealCustomer: businessProfile.idealCustomer,
      companies: companies.map((c) => ({ name: c.name, category: c.category, fitScore: c.fitScore })),
    });

    const averageFitScore =
      companies.reduce((sum, c) => sum + (c.fitScore ?? 0), 0) / companies.length;

    const warnings = getAudienceWarnings({
      companyCount: companies.length,
      averageFitScore,
      confidence: strategy.confidence,
    });

    return NextResponse.json({
      strategy,
      warnings,
      usableAudienceSize: companies.length,
      requestedAudienceSize: companyIds.length,
    });
  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json({ error: error.message }, { status: 429 });
    }
    if (error instanceof UserFacingError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    captureError("campaigns.strategy-preview", error, { organizationId: organization.id });
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 502 });
  }
}
