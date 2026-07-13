import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// docs/outrun/15 "OBSERVABILITY — every service exposes a Health Endpoint."
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok", database: "reachable" });
  } catch (error) {
    console.error("Health check failed:", error);
    return NextResponse.json(
      { status: "error", database: "unreachable" },
      { status: 503 },
    );
  }
}
