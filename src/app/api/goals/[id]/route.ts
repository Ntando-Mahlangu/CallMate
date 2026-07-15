import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/session";
import { getCurrentOrganization } from "@/lib/org";
import { prisma } from "@/lib/prisma";
import { logEvent, EventType } from "@/lib/memory/log-event";
import { captureError } from "@/lib/observability";

const GENERIC_ERROR = "We couldn't update that goal right now. Please try again in a moment.";
const STATUSES = ["ACTIVE", "COMPLETED", "ABANDONED"] as const;

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
  const existing = await prisma.goal.findFirst({ where: { id, organizationId: organization.id } });
  if (!existing) {
    return NextResponse.json({ error: "That goal could not be found." }, { status: 404 });
  }

  const { currentValue, status } = await request.json();
  if (status !== undefined && !STATUSES.includes(status)) {
    return NextResponse.json({ error: "Choose a valid status." }, { status: 400 });
  }

  try {
    const goal = await prisma.goal.update({
      where: { id },
      data: {
        currentValue: typeof currentValue === "number" ? currentValue : undefined,
        status: status ?? undefined,
        completedAt: status === "COMPLETED" ? (existing.completedAt ?? new Date()) : existing.completedAt,
      },
    });

    if (status === "COMPLETED" && existing.status !== "COMPLETED") {
      await logEvent(organization.id, EventType.GOAL_ACHIEVED, `Achieved goal "${goal.title}"`);
    }

    return NextResponse.json({ goal });
  } catch (error) {
    captureError("goals.update", error, { organizationId: organization.id, goalId: id });
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 502 });
  }
}
