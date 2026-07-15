import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/session";
import { getCurrentOrganization } from "@/lib/org";
import * as companyRepository from "@/lib/repositories/company-repository";

// Sets isSaved unconditionally (unlike the single-company POST
// /api/prospects/[id]/save, which toggles) — toggling per-company for a
// mixed-state selection would be ambiguous; "Save selected" should mean
// "these are saved now," full stop.
export async function POST(request: NextRequest) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const organization = await getCurrentOrganization(session.user.id);
  if (!organization) {
    return NextResponse.json({ error: "No workspace found for this account." }, { status: 404 });
  }

  const { companyIds } = await request.json();
  if (!Array.isArray(companyIds) || companyIds.length === 0) {
    return NextResponse.json({ error: "Select at least one prospect." }, { status: 400 });
  }

  const result = await companyRepository.setManySaved(organization.id, companyIds, true);
  return NextResponse.json({ updated: result.count });
}
