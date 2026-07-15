import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentSession } from "@/lib/session";
import { getCurrentOrganization } from "@/lib/org";
import { prisma } from "@/lib/prisma";
import { UserFacingError } from "@/lib/errors";
import { captureError } from "@/lib/observability";
import { parseJsonBody } from "@/lib/validate-request";

const GENERIC_ERROR = "We couldn't do that right now. Please try again in a moment.";

const createTaskSchema = z.object({
  title: z.string({ message: "Give the task a title." }).trim().min(1, "Give the task a title."),
  description: z.string().trim().optional(),
  impact: z.enum(["Low", "Medium", "High"], { message: "Choose a valid impact level." }),
  dueDate: z.string().optional(),
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

  const parsed = await parseJsonBody(request, createTaskSchema);
  if (parsed.error) return parsed.error;
  const { title, description, impact, dueDate } = parsed.data;

  try {
    const task = await prisma.task.create({
      data: {
        organizationId: organization.id,
        title,
        description: description ?? "",
        impact,
        dueDate: dueDate ? new Date(dueDate) : null,
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
