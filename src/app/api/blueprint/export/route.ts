import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/session";
import { getCurrentOrganization } from "@/lib/org";
import { prisma } from "@/lib/prisma";
import { blueprintToMarkdown } from "@/lib/growth-blueprint/export-markdown";
import { blueprintToPdfBuffer } from "@/lib/growth-blueprint/export-pdf";
import { RateLimitError } from "@/lib/errors";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { captureError } from "@/lib/observability";

export async function GET(request: NextRequest) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const organization = await getCurrentOrganization(session.user.id);
  if (!organization) {
    return NextResponse.json({ error: "No workspace found." }, { status: 404 });
  }

  try {
    await checkRateLimit(
      `export:${organization.id}`,
      RATE_LIMITS.EXPORT.limit,
      RATE_LIMITS.EXPORT.windowSeconds,
    );
  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json({ error: error.message }, { status: 429 });
    }
    throw error;
  }

  const format = request.nextUrl.searchParams.get("format") ?? "markdown";
  const versionParam = request.nextUrl.searchParams.get("version");

  const blueprint = await prisma.growthBlueprint.findFirst({
    where: {
      organizationId: organization.id,
      ...(versionParam ? { version: Number.parseInt(versionParam, 10) } : {}),
    },
    orderBy: { version: "desc" },
  });
  if (!blueprint) {
    return NextResponse.json({ error: "No Growth Blueprint found to export." }, { status: 404 });
  }

  const filenameBase = `${organization.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-blueprint-v${blueprint.version}`;

  if (format === "pdf") {
    try {
      const buffer = await blueprintToPdfBuffer(organization.name, blueprint);
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${filenameBase}.pdf"`,
        },
      });
    } catch (error) {
      captureError("blueprint.export.pdf", error, { organizationId: organization.id });
      return NextResponse.json(
        { error: "We couldn't generate that PDF right now. Please try again in a moment." },
        { status: 502 },
      );
    }
  }

  const markdown = blueprintToMarkdown(organization.name, blueprint);
  return new NextResponse(markdown, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filenameBase}.md"`,
    },
  });
}
