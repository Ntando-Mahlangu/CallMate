import { NextRequest, NextResponse } from "next/server";
import type { CampaignTemplateCategory } from "@prisma/client";
import { getCurrentSession } from "@/lib/session";
import { getCurrentOrganization } from "@/lib/org";
import { getTemplatesForOrg, createTemplate } from "@/lib/campaigns/templates";
import { UserFacingError } from "@/lib/errors";
import { captureError } from "@/lib/observability";

const CATEGORIES: CampaignTemplateCategory[] = [
  "COLD_OUTREACH",
  "REFERRAL_REQUESTS",
  "PARTNERSHIPS",
  "WEBSITE_AUDITS",
  "CONSULTATION_OFFERS",
  "PRODUCT_LAUNCHES",
];
const GENERIC_ERROR = "We couldn't save that template right now. Please try again in a moment.";

export async function GET() {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const organization = await getCurrentOrganization(session.user.id);
  if (!organization) {
    return NextResponse.json({ error: "No workspace found for this account." }, { status: 404 });
  }

  const templates = await getTemplatesForOrg(organization.id);
  return NextResponse.json({ templates });
}

export async function POST(request: NextRequest) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const organization = await getCurrentOrganization(session.user.id);
  if (!organization) {
    return NextResponse.json({ error: "No workspace found for this account." }, { status: 404 });
  }

  const { name, category, objective, abTest } = await request.json();
  if (typeof name !== "string" || typeof objective !== "string") {
    return NextResponse.json({ error: "Give the template a name and objective." }, { status: 400 });
  }
  if (typeof category !== "string" || !CATEGORIES.includes(category as CampaignTemplateCategory)) {
    return NextResponse.json({ error: "Choose a valid category." }, { status: 400 });
  }

  try {
    const template = await createTemplate(organization.id, {
      name,
      category: category as CampaignTemplateCategory,
      objective,
      abTest: abTest === true,
    });
    return NextResponse.json({ template });
  } catch (error) {
    if (error instanceof UserFacingError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    captureError("campaign-templates.create", error, { organizationId: organization.id });
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 502 });
  }
}
