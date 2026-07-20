import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/session";
import { getCurrentOrganization } from "@/lib/org";
import { prisma } from "@/lib/prisma";
import { campaignToSummaryMarkdown } from "@/lib/campaigns/export-summary";
import { campaignToCallScriptsMarkdown } from "@/lib/campaigns/export-call-scripts";
import { RateLimitError } from "@/lib/errors";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { logAuditEvent, AuditAction } from "@/lib/audit/log-audit-event";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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

  const { id } = await params;
  const format = request.nextUrl.searchParams.get("format") ?? "summary";

  const campaign = await prisma.campaign.findFirst({
    where: { id, organizationId: organization.id },
    include: { messages: { include: { company: true }, orderBy: { createdAt: "asc" } } },
  });
  if (!campaign) {
    return NextResponse.json({ error: "That campaign could not be found." }, { status: 404 });
  }

  const filenameBase = `${campaign.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`;

  await logAuditEvent(organization.id, AuditAction.DATA_EXPORTED, {
    actorUserId: session.user.id,
    targetType: "campaign",
    targetId: campaign.id,
    metadata: { format },
  });

  if (format === "call-scripts") {
    const companies = Array.from(
      new Map(campaign.messages.map((m) => [m.company.id, m.company])).values(),
    );
    const markdown = campaignToCallScriptsMarkdown(organization.name, campaign, companies);
    return new NextResponse(markdown, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filenameBase}-call-scripts.md"`,
      },
    });
  }

  const markdown = campaignToSummaryMarkdown(organization.name, campaign, campaign.messages);
  return new NextResponse(markdown, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filenameBase}-summary.md"`,
    },
  });
}
