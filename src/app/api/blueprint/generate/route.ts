import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/session";
import { getCurrentOrganization } from "@/lib/org";
import { generateGrowthBlueprint } from "@/lib/growth-blueprint/generate";
import { UserFacingError } from "@/lib/errors";

const GENERIC_ERROR =
  "We couldn't build your Growth Blueprint right now. Please try again in a moment.";

export async function POST() {
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

  try {
    const blueprint = await generateGrowthBlueprint(organization.id);
    return NextResponse.json({ version: blueprint.version });
  } catch (error) {
    console.error("Growth Blueprint generation failed:", error);
    const message = error instanceof UserFacingError ? error.message : GENERIC_ERROR;
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
