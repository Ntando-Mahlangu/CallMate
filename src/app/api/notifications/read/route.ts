import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/session";
import { getCurrentOrganization } from "@/lib/org";
import { prisma } from "@/lib/prisma";

// Marks one notification read, or all of them when `id` is omitted (the
// bell's "mark all read" action).
export async function POST(request: NextRequest) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const organization = await getCurrentOrganization(session.user.id);
  if (!organization) {
    return NextResponse.json({ error: "No workspace found." }, { status: 404 });
  }

  const { id } = await request.json().catch(() => ({ id: undefined }));

  await prisma.notification.updateMany({
    where: {
      organizationId: organization.id,
      readAt: null,
      ...(typeof id === "string" ? { id } : {}),
    },
    data: { readAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
