import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/session";
import { getCurrentOrganization, getMembershipFor } from "@/lib/org";
import { canManageTeam } from "@/lib/teams/permissions";
import { buildAccountExport } from "@/lib/export/account-export";
import { RateLimitError } from "@/lib/errors";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { captureError } from "@/lib/observability";
import { logAuditEvent, AuditAction } from "@/lib/audit/log-audit-event";

// Article XVIII "Users own their data. Users can export it." — Owner/Admin
// only, same scope as every other workspace-wide management action
// (src/lib/teams/permissions.ts's canManageTeam), since this exports
// every member's business data at once, not just what the requester
// personally created.
export async function GET() {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const organization = await getCurrentOrganization(session.user.id);
  if (!organization) return NextResponse.json({ error: "No workspace found for this account." }, { status: 404 });

  const membership = await getMembershipFor(session.user.id, organization.id);
  if (!membership || !canManageTeam(membership.role)) {
    return NextResponse.json(
      { error: "Only workspace owners and admins can export workspace data." },
      { status: 403 },
    );
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

  try {
    const data = await buildAccountExport(organization.id);

    await logAuditEvent(organization.id, AuditAction.DATA_EXPORTED, {
      actorUserId: session.user.id,
      targetType: "account",
    });

    const filenameBase = organization.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
    return new NextResponse(JSON.stringify(data, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${filenameBase}-export.json"`,
      },
    });
  } catch (error) {
    captureError("team.export-data", error, { organizationId: organization.id });
    return NextResponse.json(
      { error: "We couldn't generate your export right now. Please try again in a moment." },
      { status: 502 },
    );
  }
}
