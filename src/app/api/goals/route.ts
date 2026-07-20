import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentSession } from "@/lib/session";
import { getCurrentOrganization } from "@/lib/org";
import { prisma } from "@/lib/prisma";
import { logEvent, EventType } from "@/lib/memory/log-event";
import { UserFacingError } from "@/lib/errors";
import { captureError } from "@/lib/observability";
import { parseJsonBody } from "@/lib/validate-request";

const GENERIC_ERROR = "We couldn't do that right now. Please try again in a moment.";

const createGoalSchema = z.object({
  title: z.string({ message: "Give the goal a title." }).trim().min(1, "Give the goal a title."),
  targetMetric: z.string().optional(),
  targetValue: z.number().optional(),
  targetDate: z.string().optional(),
});

export async function GET() {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const organization = await getCurrentOrganization(session.user.id);
  if (!organization) {
    return NextResponse.json({ error: "No workspace found." }, { status: 404 });
  }

  const goals = await prisma.goal.findMany({
    where: { organizationId: organization.id },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({ goals });
}

// docs/outrun/10 "GOAL MANAGEMENT" — "Users define goals." Examples given
// there ("First Customer", "$10k MRR", "100 Monthly Leads") mix milestone
// goals (no target value) with metric goals (targetMetric + targetValue),
// so both are optional here rather than forcing every goal into a number.
export async function POST(request: NextRequest) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const organization = await getCurrentOrganization(session.user.id);
  if (!organization) {
    return NextResponse.json({ error: "No workspace found." }, { status: 404 });
  }

  const parsed = await parseJsonBody(request, createGoalSchema);
  if (parsed.error) return parsed.error;
  const { title, targetMetric, targetValue, targetDate } = parsed.data;

  try {
    const goal = await prisma.goal.create({
      data: {
        organizationId: organization.id,
        title,
        targetMetric: targetMetric || null,
        targetValue: targetValue ?? null,
        targetDate: targetDate ? new Date(targetDate) : null,
      },
    });
    await logEvent(organization.id, EventType.GOAL_CREATED, `Created goal "${goal.title}"`);
    return NextResponse.json({ goal });
  } catch (error) {
    if (error instanceof UserFacingError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    captureError("goals.create", error, { organizationId: organization.id });
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 502 });
  }
}
