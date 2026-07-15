import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/session";
import { getCurrentOrganization } from "@/lib/org";
import { prisma } from "@/lib/prisma";
import { captureError } from "@/lib/observability";

const GENERIC_ERROR = "We couldn't update that task right now. Please try again in a moment.";
const STATUSES = ["PENDING", "COMPLETED", "DISMISSED"] as const;

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const organization = await getCurrentOrganization(session.user.id);
  if (!organization) {
    return NextResponse.json({ error: "No workspace found." }, { status: 404 });
  }

  const { id } = await params;
  const { status, completionNotes } = await request.json();
  if (!STATUSES.includes(status)) {
    return NextResponse.json({ error: "Choose a valid status." }, { status: 400 });
  }

  const existing = await prisma.task.findFirst({ where: { id, organizationId: organization.id } });
  if (!existing) {
    return NextResponse.json({ error: "That task could not be found." }, { status: 404 });
  }

  try {
    const task = await prisma.task.update({
      where: { id },
      data: {
        status,
        ownerUserId: existing.ownerUserId ?? session.user.id,
        completionNotes: typeof completionNotes === "string" ? completionNotes : existing.completionNotes,
        completedAt: status === "PENDING" ? null : (existing.completedAt ?? new Date()),
      },
    });
    return NextResponse.json({ task });
  } catch (error) {
    captureError("tasks.update", error, { organizationId: organization.id, taskId: id });
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 502 });
  }
}
