import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/session";
import { getCurrentOrganization } from "@/lib/org";
import { prisma } from "@/lib/prisma";

const LIST_LIMIT = 20;

export async function GET() {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const organization = await getCurrentOrganization(session.user.id);
  if (!organization) {
    return NextResponse.json({ error: "No workspace found." }, { status: 404 });
  }

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { organizationId: organization.id },
      orderBy: { createdAt: "desc" },
      take: LIST_LIMIT,
    }),
    prisma.notification.count({
      where: { organizationId: organization.id, readAt: null },
    }),
  ]);

  return NextResponse.json({ notifications, unreadCount });
}
