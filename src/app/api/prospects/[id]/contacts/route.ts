import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentSession } from "@/lib/session";
import { getCurrentOrganization } from "@/lib/org";
import { prisma } from "@/lib/prisma";
import * as companyRepository from "@/lib/repositories/company-repository";
import { captureError } from "@/lib/observability";
import { parseJsonBody } from "@/lib/validate-request";

const GENERIC_ERROR = "We couldn't do that right now. Please try again in a moment.";

const createContactSchema = z.object({
  name: z.string({ message: "Give the contact a name." }).trim().min(1, "Give the contact a name."),
  role: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
});

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const organization = await getCurrentOrganization(session.user.id);
  if (!organization) {
    return NextResponse.json({ error: "No workspace found." }, { status: 404 });
  }

  const { id } = await params;
  const company = await companyRepository.findByIdForOrg(organization.id, id);
  if (!company) {
    return NextResponse.json({ error: "That prospect could not be found." }, { status: 404 });
  }

  const contacts = await prisma.contact.findMany({
    where: { companyId: id },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ contacts });
}

// docs/outrun/12 "CONTACT MODEL" — a named person at a prospected Company,
// distinct from Company.contactEmail (a generic inbox, not a person).
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const organization = await getCurrentOrganization(session.user.id);
  if (!organization) {
    return NextResponse.json({ error: "No workspace found." }, { status: 404 });
  }

  const { id } = await params;
  const company = await companyRepository.findByIdForOrg(organization.id, id);
  if (!company) {
    return NextResponse.json({ error: "That prospect could not be found." }, { status: 404 });
  }

  const parsed = await parseJsonBody(request, createContactSchema);
  if (parsed.error) return parsed.error;
  const { name, role, email, phone } = parsed.data;

  try {
    const contact = await prisma.contact.create({
      data: {
        companyId: id,
        name,
        role: role ? role : null,
        email: email ? email : null,
        phone: phone ? phone : null,
      },
    });
    return NextResponse.json({ contact });
  } catch (error) {
    captureError("prospects.contacts.create", error, { organizationId: organization.id, companyId: id });
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 502 });
  }
}
