import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/session";
import { getCurrentOrganization } from "@/lib/org";
import { createCampaign } from "@/lib/campaigns/create";
import { UserFacingError } from "@/lib/errors";

const GENERIC_ERROR =
  "We couldn't build this campaign right now. Please try again in a moment.";

export async function POST(request: NextRequest) {
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

  const { name, objective, companyIds } = await request.json();
  if (typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "Give your campaign a name." }, { status: 400 });
  }
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
    const result = await createCampaign(organization.id, {
      name: name.trim(),
      objective: objective.trim(),
      companyIds,
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof UserFacingError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Campaign creation failed:", error);
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 502 });
  }
}
