import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentSession } from "@/lib/session";
import { getCurrentOrganization } from "@/lib/org";
import { prisma } from "@/lib/prisma";
import { parseJsonBody } from "@/lib/validate-request";

const markNotificationReadSchema = z.object({
  id: z.string().min(1, "That notification could not be found.").optional(),
});

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

  const parsed = await parseJsonBody(request, markNotificationReadSchema);
  if (parsed.error) return parsed.error;
  const { id } = parsed.data;

  await prisma.notification.updateMany({
    where: {
      organizationId: organization.id,
      readAt: null,
      ...(id ? { id } : {}),
    },
    data: { readAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
