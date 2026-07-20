import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentSession } from "@/lib/session";
import { getCurrentOrganization } from "@/lib/org";
import * as companyRepository from "@/lib/repositories/company-repository";
import { parseJsonBody } from "@/lib/validate-request";

const bulkSaveSchema = z.object({
  companyIds: z
    .array(z.string(), { message: "Select at least one prospect." })
    .min(1, "Select at least one prospect."),
});

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

  const parsed = await parseJsonBody(request, bulkSaveSchema);
  if (parsed.error) return parsed.error;
  const { companyIds } = parsed.data;

  const result = await companyRepository.setManySaved(organization.id, companyIds, true);
  return NextResponse.json({ updated: result.count });
}
