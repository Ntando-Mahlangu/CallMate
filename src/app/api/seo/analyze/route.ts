import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/session";
import { getCurrentOrganization } from "@/lib/org";
import { analyzeSEO } from "@/lib/seo/analyze";
import { UserFacingError } from "@/lib/errors";
import { captureError } from "@/lib/observability";

const GENERIC_ERROR =
  "We couldn't analyze your website right now. Please try again in a moment.";

export async function POST() {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const organization = await getCurrentOrganization(session.user.id);
  if (!organization) {
    return NextResponse.json({ error: "No workspace found." }, { status: 404 });
  }

  try {
    const analysis = await analyzeSEO(organization.id);
    return NextResponse.json({ analysis });
  } catch (error) {
    if (error instanceof UserFacingError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    captureError("seo.analyze", error, { organizationId: organization.id });
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 502 });
  }
}
