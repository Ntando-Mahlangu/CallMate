import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentSession } from "@/lib/session";
import { getCurrentOrganization, getMembershipFor } from "@/lib/org";
import { createApiKey, listApiKeys } from "@/lib/api-keys/service";
import { UserFacingError } from "@/lib/errors";
import { captureError } from "@/lib/observability";
import { parseJsonBody } from "@/lib/validate-request";

const GENERIC_ERROR = "We couldn't create that API key right now. Please try again in a moment.";

const createApiKeySchema = z.object({
  name: z.string({ message: "Give the key a name." }).trim().min(1, "Give the key a name.").max(60),
});

export async function GET() {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const organization = await getCurrentOrganization(session.user.id);
  if (!organization) return NextResponse.json({ error: "No workspace found for this account." }, { status: 404 });

  const keys = await listApiKeys(organization.id);
  return NextResponse.json({ keys });
}

export async function POST(request: NextRequest) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const organization = await getCurrentOrganization(session.user.id);
  if (!organization) return NextResponse.json({ error: "No workspace found for this account." }, { status: 404 });

  const membership = await getMembershipFor(session.user.id, organization.id);
  if (!membership) return NextResponse.json({ error: "No workspace found for this account." }, { status: 404 });

  const parsed = await parseJsonBody(request, createApiKeySchema);
  if (parsed.error) return parsed.error;

  try {
    const created = await createApiKey(
      organization.id,
      organization.planTier,
      session.user.id,
      membership.role,
      parsed.data.name,
    );
    return NextResponse.json({ key: created });
  } catch (error) {
    if (error instanceof UserFacingError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    captureError("team.api-keys.create", error, { organizationId: organization.id });
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 502 });
  }
}
