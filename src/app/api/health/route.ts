import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { captureError } from "@/lib/observability";
import { API_VERSION } from "@/lib/api-version";

// docs/outrun/15 "OBSERVABILITY — every service exposes a Health Endpoint."
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok", database: "reachable", apiVersion: API_VERSION });
  } catch (error) {
    captureError("health-check", error);
    return NextResponse.json(
      { status: "error", database: "unreachable", apiVersion: API_VERSION },
      { status: 503 },
    );
  }
}
