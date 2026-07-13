import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/session";
import { getCurrentOrganization } from "@/lib/org";
import { prisma } from "@/lib/prisma";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
  const company = await prisma.company.findFirst({
    where: { id, organizationId: organization.id },
  });
  if (!company) {
    return NextResponse.json({ error: "Company not found." }, { status: 404 });
  }

  const { email } = await request.json();
  const trimmed = typeof email === "string" ? email.trim() : "";
  if (trimmed && !EMAIL_RE.test(trimmed)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const updated = await prisma.company.update({
    where: { id: company.id },
    data: { contactEmail: trimmed || null },
  });

  return NextResponse.json({ contactEmail: updated.contactEmail });
}
