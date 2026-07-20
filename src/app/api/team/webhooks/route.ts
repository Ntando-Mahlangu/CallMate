import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentSession } from "@/lib/session";
import { getCurrentOrganization, getMembershipFor } from "@/lib/org";
import { registerWebhookEndpoint, listWebhookEndpoints } from "@/lib/webhooks/service";
import { UserFacingError } from "@/lib/errors";
import { captureError } from "@/lib/observability";
import { parseJsonBody } from "@/lib/validate-request";

const GENERIC_ERROR = "We couldn't add that webhook right now. Please try again in a moment.";

const createWebhookSchema = z.object({
  url: z.string({ message: "Enter a URL." }).trim().min(1, "Enter a URL.").max(2048),
});

export async function GET() {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const organization = await getCurrentOrganization(session.user.id);
  if (!organization) return NextResponse.json({ error: "No workspace found for this account." }, { status: 404 });

  const endpoints = await listWebhookEndpoints(organization.id);
  return NextResponse.json({ endpoints });
}

export async function POST(request: NextRequest) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const organization = await getCurrentOrganization(session.user.id);
  if (!organization) return NextResponse.json({ error: "No workspace found for this account." }, { status: 404 });

  const membership = await getMembershipFor(session.user.id, organization.id);
  if (!membership) return NextResponse.json({ error: "No workspace found for this account." }, { status: 404 });

  const parsed = await parseJsonBody(request, createWebhookSchema);
  if (parsed.error) return parsed.error;

  try {
    const created = await registerWebhookEndpoint(
      organization.id,
      session.user.id,
      membership.role,
      parsed.data.url,
    );
    return NextResponse.json({ endpoint: created });
  } catch (error) {
    if (error instanceof UserFacingError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    captureError("team.webhooks.create", error, { organizationId: organization.id });
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 502 });
  }
}
