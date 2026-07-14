import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/session";
import { getCurrentOrganization } from "@/lib/org";
import { renameLeadList, deleteLeadList } from "@/lib/prospects/lead-lists";
import { UserFacingError } from "@/lib/errors";
import { captureError } from "@/lib/observability";

const GENERIC_ERROR = "We couldn't do that right now. Please try again in a moment.";

export async function PATCH(
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
  const { name } = await request.json();
  if (typeof name !== "string") {
    return NextResponse.json({ error: "Give the list a name." }, { status: 400 });
  }

  try {
    const list = await renameLeadList(organization.id, id, name);
    return NextResponse.json({ list });
  } catch (error) {
    if (error instanceof UserFacingError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    captureError("lead-lists.rename", error, { organizationId: organization.id, leadListId: id });
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 502 });
  }
}

export async function DELETE(
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

  try {
    await deleteLeadList(organization.id, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof UserFacingError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    captureError("lead-lists.delete", error, { organizationId: organization.id, leadListId: id });
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 502 });
  }
}
