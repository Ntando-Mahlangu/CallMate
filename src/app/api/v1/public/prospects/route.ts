import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveOrganizationForApiKey } from "@/lib/api-keys/service";
import { RateLimitError } from "@/lib/errors";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { captureError } from "@/lib/observability";

// docs/outrun/14 "API Access (Limited)" — the one real endpoint behind an
// issued API key today (Growth plan and above). Read-only, org-scoped via
// the key itself (never a client-supplied organizationId — Article XII),
// and deliberately returns only fields safe to hand to an external
// integration: no internal research JSON, no contact PII beyond what the
// in-app Prospects list already shows.
const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

function clampLimit(raw: string | null): number {
  const parsed = raw ? Number.parseInt(raw, 10) : DEFAULT_LIMIT;
  if (!Number.isFinite(parsed) || parsed < 1) return DEFAULT_LIMIT;
  return Math.min(parsed, MAX_LIMIT);
}

function clampOffset(raw: string | null): number {
  const parsed = raw ? Number.parseInt(raw, 10) : 0;
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return parsed;
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const rawKey = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length).trim() : null;
  if (!rawKey) {
    return NextResponse.json(
      { error: "Missing API key. Pass it as 'Authorization: Bearer <key>'." },
      { status: 401 },
    );
  }

  const resolved = await resolveOrganizationForApiKey(rawKey);
  if (!resolved) {
    return NextResponse.json({ error: "Invalid, revoked, or unauthorized API key." }, { status: 401 });
  }

  try {
    await checkRateLimit(
      `public-api:${resolved.organizationId}`,
      RATE_LIMITS.PUBLIC_API.limit,
      RATE_LIMITS.PUBLIC_API.windowSeconds,
    );
  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json({ error: error.message }, { status: 429 });
    }
    throw error;
  }

  const { searchParams } = new URL(request.url);
  const limit = clampLimit(searchParams.get("limit"));
  const offset = clampOffset(searchParams.get("offset"));

  try {
    const [companies, total] = await Promise.all([
      prisma.company.findMany({
        where: { organizationId: resolved.organizationId },
        orderBy: { createdAt: "desc" },
        skip: offset,
        take: limit,
        select: {
          id: true,
          name: true,
          website: true,
          category: true,
          formattedAddress: true,
          fitScore: true,
          confidenceScore: true,
          isSaved: true,
          createdAt: true,
        },
      }),
      prisma.company.count({ where: { organizationId: resolved.organizationId } }),
    ]);

    return NextResponse.json({ data: companies, pagination: { limit, offset, total } });
  } catch (error) {
    captureError("public-api.prospects", error, { organizationId: resolved.organizationId });
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 502 });
  }
}
