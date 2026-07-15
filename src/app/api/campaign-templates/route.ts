import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { CampaignTemplateCategory } from "@prisma/client";
import { getCurrentSession } from "@/lib/session";
import { getCurrentOrganization } from "@/lib/org";
import { getTemplatesForOrg, createTemplate } from "@/lib/campaigns/templates";
import { UserFacingError } from "@/lib/errors";
import { captureError } from "@/lib/observability";
import { parseJsonBody } from "@/lib/validate-request";

const CATEGORIES: CampaignTemplateCategory[] = [
  "COLD_OUTREACH",
  "REFERRAL_REQUESTS",
  "PARTNERSHIPS",
  "WEBSITE_AUDITS",
  "CONSULTATION_OFFERS",
  "PRODUCT_LAUNCHES",
];
const GENERIC_ERROR = "We couldn't save that template right now. Please try again in a moment.";

const createCampaignTemplateSchema = z.object({
  name: z.string({ message: "Give the template a name and objective." }),
  objective: z.string({ message: "Give the template a name and objective." }),
  category: z.enum(CATEGORIES as [CampaignTemplateCategory, ...CampaignTemplateCategory[]], {
    message: "Choose a valid category.",
  }),
  abTest: z.unknown().optional(),
});

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

  const parsed = await parseJsonBody(request, createCampaignTemplateSchema);
  if (parsed.error) return parsed.error;
  const { name, category, objective, abTest } = parsed.data;

  try {
    const template = await createTemplate(organization.id, {
      name,
      category,
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
