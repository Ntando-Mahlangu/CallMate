import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/session";
import { getCurrentOrganization } from "@/lib/org";
import * as companyRepository from "@/lib/repositories/company-repository";
import { companiesToCsv } from "@/lib/prospects/export-csv";
import { prospectsToPdfBuffer } from "@/lib/prospects/export-pdf";
import { RateLimitError } from "@/lib/errors";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { captureError } from "@/lib/observability";
import { logAuditEvent, AuditAction } from "@/lib/audit/log-audit-event";
import { isFeatureEnabled, FEATURE_FLAGS } from "@/lib/billing/feature-flags";

export async function POST(request: NextRequest) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const organization = await getCurrentOrganization(session.user.id);
  if (!organization) {
    return NextResponse.json({ error: "No workspace found." }, { status: 404 });
  }

  if (!isFeatureEnabled(organization.planTier, FEATURE_FLAGS.PROSPECTS_EXPORT)) {
    return NextResponse.json(
      { error: "Exporting prospects is available on the Starter plan and above." },
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

  const { companyIds, format } = await request.json();
  if (!Array.isArray(companyIds) || companyIds.length === 0) {
    return NextResponse.json({ error: "Select at least one prospect to export." }, { status: 400 });
  }
  if (format !== "csv" && format !== "pdf") {
    return NextResponse.json({ error: "Unsupported export format." }, { status: 400 });
  }

  const companies = await companyRepository.findManyByIdsForOrg(organization.id, companyIds);
  if (companies.length === 0) {
    return NextResponse.json({ error: "None of those prospects could be found." }, { status: 404 });
  }

  const filenameBase = `${organization.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-prospects`;

  await logAuditEvent(organization.id, AuditAction.DATA_EXPORTED, {
    actorUserId: session.user.id,
    targetType: "prospects",
    metadata: { format, count: companies.length },
  });

  if (format === "pdf") {
    try {
      const buffer = await prospectsToPdfBuffer(organization.name, companies);
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${filenameBase}.pdf"`,
        },
      });
    } catch (error) {
      captureError("prospects.export.pdf", error, { organizationId: organization.id });
      return NextResponse.json(
        { error: "We couldn't generate that PDF right now. Please try again in a moment." },
        { status: 502 },
      );
    }
  }

  const csv = companiesToCsv(companies);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filenameBase}.csv"`,
    },
  });
}
