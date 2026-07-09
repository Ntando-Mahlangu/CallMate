import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/session";
import { getCurrentOrganization } from "@/lib/org";
import { generateOutreach } from "@/lib/prospects/outreach";
import { UserFacingError } from "@/lib/errors";

const GENERIC_ERROR =
  "We couldn't generate outreach right now. Please try again in a moment.";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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

  const { id } = await params;

  try {
    const message = await generateOutreach(id, organization.id);
    return NextResponse.json({ message });
  } catch (error) {
    console.error("Outreach generation failed:", error);
    const message = error instanceof UserFacingError ? error.message : GENERIC_ERROR;
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
