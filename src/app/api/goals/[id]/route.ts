import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentSession } from "@/lib/session";
import { getCurrentOrganization } from "@/lib/org";
import { prisma } from "@/lib/prisma";
import { logEvent, EventType } from "@/lib/memory/log-event";
import { captureError } from "@/lib/observability";
import { parseJsonBody } from "@/lib/validate-request";

const GENERIC_ERROR = "We couldn't update that goal right now. Please try again in a moment.";
const STATUSES = ["ACTIVE", "COMPLETED", "ABANDONED"] as const;

const updateGoalSchema = z.object({
  currentValue: z.number().optional(),
  status: z.enum(STATUSES, { message: "Choose a valid status." }).optional(),
});

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

  const parsed = await parseJsonBody(request, updateGoalSchema);
  if (parsed.error) return parsed.error;
  const { currentValue, status } = parsed.data;

  try {
    const goal = await prisma.goal.update({
      where: { id },
      data: {
        currentValue,
        status,
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
