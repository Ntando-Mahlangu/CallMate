import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/session";
import { getCurrentOrganization } from "@/lib/org";
import { generateSEOContent } from "@/lib/seo/content";
import { UserFacingError } from "@/lib/errors";

const GENERIC_ERROR =
  "We couldn't generate that content right now. Please try again in a moment.";

export async function POST(request: NextRequest) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const organization = await getCurrentOrganization(session.user.id);
  if (!organization) {
    return NextResponse.json({ error: "No workspace found." }, { status: 404 });
  }

  const { headline, targetKeyword, businessGoal } = await request.json();
  if (
    typeof headline !== "string" ||
    typeof targetKeyword !== "string" ||
    typeof businessGoal !== "string"
  ) {
    return NextResponse.json({ error: "Missing content idea details." }, { status: 400 });
  }

  try {
    const piece = await generateSEOContent(organization.id, {
      headline,
      targetKeyword,
      businessGoal,
    });
    return NextResponse.json({ piece });
  } catch (error) {
    if (error instanceof UserFacingError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("SEO content generation failed:", error);
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 502 });
  }
}
