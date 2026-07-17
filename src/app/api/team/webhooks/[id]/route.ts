import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentSession } from "@/lib/session";
import { getCurrentOrganization, getMembershipFor } from "@/lib/org";
import { deleteWebhookEndpoint, setWebhookEndpointEnabled } from "@/lib/webhooks/service";
import { UserFacingError } from "@/lib/errors";
import { captureError } from "@/lib/observability";
import { parseJsonBody } from "@/lib/validate-request";

const GENERIC_ERROR = "We couldn't remove that webhook right now. Please try again in a moment.";
const TOGGLE_GENERIC_ERROR = "We couldn't update that webhook right now. Please try again in a moment.";

const toggleWebhookSchema = z.object({
  enabled: z.boolean({ message: "enabled must be true or false." }),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const organization = await getCurrentOrganization(session.user.id);
  if (!organization) return NextResponse.json({ error: "No workspace found for this account." }, { status: 404 });

  const membership = await getMembershipFor(session.user.id, organization.id);
  if (!membership) return NextResponse.json({ error: "No workspace found for this account." }, { status: 404 });

  const { id } = await params;
  const parsed = await parseJsonBody(request, toggleWebhookSchema);
  if (parsed.error) return parsed.error;

  try {
    const endpoint = await setWebhookEndpointEnabled(
      organization.id,
      id,
      session.user.id,
      membership.role,
      parsed.data.enabled,
    );
    return NextResponse.json({ endpoint: { id: endpoint.id, enabled: endpoint.enabled } });
  } catch (error) {
    if (error instanceof UserFacingError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    captureError("team.webhooks.toggle", error, { organizationId: organization.id });
    return NextResponse.json({ error: TOGGLE_GENERIC_ERROR }, { status: 502 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const organization = await getCurrentOrganization(session.user.id);
  if (!organization) return NextResponse.json({ error: "No workspace found for this account." }, { status: 404 });

  const membership = await getMembershipFor(session.user.id, organization.id);
  if (!membership) return NextResponse.json({ error: "No workspace found for this account." }, { status: 404 });

  const { id } = await params;

  try {
    await deleteWebhookEndpoint(organization.id, id, session.user.id, membership.role);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof UserFacingError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    captureError("team.webhooks.delete", error, { organizationId: organization.id });
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 502 });
  }
}
