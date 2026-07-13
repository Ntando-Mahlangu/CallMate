import { NextResponse } from "next/server";
import { UsageEventType } from "@prisma/client";
import { getCurrentSession } from "@/lib/session";
import { getCurrentOrganization } from "@/lib/org";
import { generateGrowthBlueprint } from "@/lib/growth-blueprint/generate";
import { checkAndRecordUsage } from "@/lib/billing/usage";
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
    await checkAndRecordUsage(organization.id, UsageEventType.BLUEPRINT_GENERATION);
    const blueprint = await generateGrowthBlueprint(organization.id);
    return NextResponse.json({ version: blueprint.version });
  } catch (error) {
    if (error instanceof UserFacingError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Growth Blueprint generation failed:", error);
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 502 });
  }
}
