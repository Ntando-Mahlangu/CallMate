import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentSession } from "@/lib/session";
import { getCurrentOrganization } from "@/lib/org";
import { prisma } from "@/lib/prisma";
import * as companyRepository from "@/lib/repositories/company-repository";
import { captureError } from "@/lib/observability";
import { parseJsonBody } from "@/lib/validate-request";

const GENERIC_ERROR = "We couldn't do that right now. Please try again in a moment.";

const updateContactSchema = z.object({
  relationshipStatus: z
    .enum(["NEW", "CONTACTED", "RESPONDED", "QUALIFIED", "CUSTOMER", "LOST"], {
      message: "Choose a valid relationship status.",
    })
    .optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; contactId: string }> },
) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const organization = await getCurrentOrganization(session.user.id);
  if (!organization) {
    return NextResponse.json({ error: "No workspace found." }, { status: 404 });
  }

  const { id, contactId } = await params;
  const company = await companyRepository.findByIdForOrg(organization.id, id);
  if (!company) {
    return NextResponse.json({ error: "That prospect could not be found." }, { status: 404 });
  }

  const existing = await prisma.contact.findFirst({ where: { id: contactId, companyId: id } });
  if (!existing) {
    return NextResponse.json({ error: "That contact could not be found." }, { status: 404 });
  }

  const parsed = await parseJsonBody(request, updateContactSchema);
  if (parsed.error) return parsed.error;
  const { relationshipStatus } = parsed.data;

  try {
    const contact = await prisma.contact.update({
      where: { id: contactId },
      data: { relationshipStatus: relationshipStatus ?? undefined },
    });
    return NextResponse.json({ contact });
  } catch (error) {
    captureError("prospects.contacts.update", error, { organizationId: organization.id, contactId });
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 502 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; contactId: string }> },
) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const organization = await getCurrentOrganization(session.user.id);
  if (!organization) {
    return NextResponse.json({ error: "No workspace found." }, { status: 404 });
  }

  const { id, contactId } = await params;
  const company = await companyRepository.findByIdForOrg(organization.id, id);
  if (!company) {
    return NextResponse.json({ error: "That prospect could not be found." }, { status: 404 });
  }

  const existing = await prisma.contact.findFirst({ where: { id: contactId, companyId: id } });
  if (!existing) {
    return NextResponse.json({ error: "That contact could not be found." }, { status: 404 });
  }

  await prisma.contact.delete({ where: { id: contactId } });
  return NextResponse.json({ ok: true });
}
