import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/session";
import { getCurrentOrganization } from "@/lib/org";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const organization = await getCurrentOrganization(session.user.id);
  if (!organization) {
    return NextResponse.json({ error: "No workspace found." }, { status: 404 });
  }

  const { enabled } = await request.json();
  if (typeof enabled !== "boolean") {
    return NextResponse.json({ error: "Missing sharing preference." }, { status: 400 });
  }

  const org = await prisma.organization.findUniqueOrThrow({ where: { id: organization.id } });
  const token = enabled ? (org.blueprintShareToken ?? crypto.randomUUID()) : org.blueprintShareToken;

  const updated = await prisma.organization.update({
    where: { id: organization.id },
    data: { blueprintShareEnabled: enabled, blueprintShareToken: token },
  });

  return NextResponse.json({
    shareEnabled: updated.blueprintShareEnabled,
    shareToken: updated.blueprintShareToken,
  });
}
