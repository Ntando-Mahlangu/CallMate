import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/session";
import { getCurrentOrganization } from "@/lib/org";
import {
  getLeadListsForOrg,
  getLeadListIdsForCompany,
  addCompanyToLeadList,
  removeCompanyFromLeadList,
} from "@/lib/prospects/lead-lists";
import { UserFacingError } from "@/lib/errors";
import { captureError } from "@/lib/observability";

const GENERIC_ERROR = "We couldn't do that right now. Please try again in a moment.";

export async function GET(
  _request: NextRequest,
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
  const [lists, memberListIds] = await Promise.all([
    getLeadListsForOrg(organization.id),
    getLeadListIdsForCompany(organization.id, id),
  ]);

  return NextResponse.json({ lists, memberListIds });
}

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
  const { leadListId } = await request.json();
  if (typeof leadListId !== "string") {
    return NextResponse.json({ error: "Choose a list." }, { status: 400 });
  }

  try {
    await addCompanyToLeadList(organization.id, leadListId, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof UserFacingError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    captureError("prospects.lists.add", error, { organizationId: organization.id, companyId: id });
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 502 });
  }
}

export async function DELETE(
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
  const { leadListId } = await request.json();
  if (typeof leadListId !== "string") {
    return NextResponse.json({ error: "Choose a list." }, { status: 400 });
  }

  try {
    await removeCompanyFromLeadList(organization.id, leadListId, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof UserFacingError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    captureError("prospects.lists.remove", error, { organizationId: organization.id, companyId: id });
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 502 });
  }
}
