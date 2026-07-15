import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/session";
import { getCurrentOrganization } from "@/lib/org";
import * as companyRepository from "@/lib/repositories/company-repository";

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
  const company = await companyRepository.findByIdForOrg(organization.id, id);
  if (!company) {
    return NextResponse.json({ error: "Company not found." }, { status: 404 });
  }

  const updated = await companyRepository.setSaved(company.id, !company.isSaved);

  return NextResponse.json({ isSaved: updated.isSaved });
}
