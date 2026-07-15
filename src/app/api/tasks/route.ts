import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/session";
import { getCurrentOrganization } from "@/lib/org";
import { prisma } from "@/lib/prisma";
import { UserFacingError } from "@/lib/errors";
import { captureError } from "@/lib/observability";

const GENERIC_ERROR = "We couldn't do that right now. Please try again in a moment.";
const IMPACTS = ["Low", "Medium", "High"] as const;

export async function GET() {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const organization = await getCurrentOrganization(session.user.id);
  if (!organization) {
    return NextResponse.json({ error: "No workspace found." }, { status: 404 });
  }

  const tasks = await prisma.task.findMany({
    where: { organizationId: organization.id },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({ tasks });
}

// docs/outrun/12 "TASK MODEL" — most tasks are auto-generated from a
// Blueprint's roadmap (src/lib/tasks/generate-from-blueprint.ts), but
// users can add their own too; a task list that only ever fills itself
// isn't a real to-do list.
export async function POST(request: NextRequest) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const organization = await getCurrentOrganization(session.user.id);
  if (!organization) {
    return NextResponse.json({ error: "No workspace found." }, { status: 404 });
  }

  const { title, description, impact, dueDate } = await request.json();
  if (typeof title !== "string" || !title.trim()) {
    return NextResponse.json({ error: "Give the task a title." }, { status: 400 });
  }
  if (!IMPACTS.includes(impact)) {
    return NextResponse.json({ error: "Choose a valid impact level." }, { status: 400 });
  }

  try {
    const task = await prisma.task.create({
      data: {
        organizationId: organization.id,
        title: title.trim(),
        description: typeof description === "string" ? description.trim() : "",
        impact,
        dueDate: typeof dueDate === "string" && dueDate ? new Date(dueDate) : null,
      },
    });
    return NextResponse.json({ task });
  } catch (error) {
    if (error instanceof UserFacingError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    captureError("tasks.create", error, { organizationId: organization.id });
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 502 });
  }
}
