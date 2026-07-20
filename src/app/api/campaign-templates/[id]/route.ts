import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { CampaignTemplateCategory } from "@prisma/client";
import { getCurrentSession } from "@/lib/session";
import { getCurrentOrganization } from "@/lib/org";
import { updateTemplate, deleteTemplate } from "@/lib/campaigns/templates";
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
const GENERIC_ERROR = "We couldn't update that template right now. Please try again in a moment.";

const updateCampaignTemplateSchema = z.object({
  name: z.string({ message: "Give the template a name and objective." }),
  objective: z.string({ message: "Give the template a name and objective." }),
  category: z.enum(CATEGORIES as [CampaignTemplateCategory, ...CampaignTemplateCategory[]], {
    message: "Choose a valid category.",
  }),
  abTest: z.unknown().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const organization = await getCurrentOrganization(session.user.id);
  if (!organization) {
    return NextResponse.json({ error: "No workspace found for this account." }, { status: 404 });
  }

  const { id } = await params;
  const parsed = await parseJsonBody(request, updateCampaignTemplateSchema);
  if (parsed.error) return parsed.error;
  const { name, category, objective, abTest } = parsed.data;

  try {
    const template = await updateTemplate(organization.id, id, {
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
    captureError("campaign-templates.update", error, { organizationId: organization.id, templateId: id });
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 502 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const organization = await getCurrentOrganization(session.user.id);
  if (!organization) {
    return NextResponse.json({ error: "No workspace found for this account." }, { status: 404 });
  }

  const { id } = await params;

  try {
    await deleteTemplate(organization.id, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof UserFacingError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    captureError("campaign-templates.delete", error, { organizationId: organization.id, templateId: id });
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 502 });
  }
}
