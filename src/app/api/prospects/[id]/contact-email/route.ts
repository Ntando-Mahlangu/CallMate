import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentSession } from "@/lib/session";
import { getCurrentOrganization } from "@/lib/org";
import * as companyRepository from "@/lib/repositories/company-repository";
import { parseJsonBody } from "@/lib/validate-request";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// The prior route never hard-failed on a non-string `email` — it silently
// treated anything but a string as "clear the email" — so this stays
// permissive here rather than a strict z.string(), matching the pattern for
// campaigns/route.ts's `strategy` field.
const updateContactEmailSchema = z.object({
  email: z.unknown().optional(),
});

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
    return NextResponse.json({ error: "No workspace found for this account." }, { status: 404 });
  }

  const { id } = await params;
  const company = await companyRepository.findByIdForOrg(organization.id, id);
  if (!company) {
    return NextResponse.json({ error: "Company not found." }, { status: 404 });
  }

  const parsed = await parseJsonBody(request, updateContactEmailSchema);
  if (parsed.error) return parsed.error;
  const { email } = parsed.data;
  const trimmed = typeof email === "string" ? email.trim() : "";
  if (trimmed && !EMAIL_RE.test(trimmed)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const updated = await companyRepository.updateContactEmail(company.id, trimmed || null);

  return NextResponse.json({ contactEmail: updated.contactEmail });
}
