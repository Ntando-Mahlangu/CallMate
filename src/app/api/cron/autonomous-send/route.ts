import { NextRequest, NextResponse } from "next/server";
import { runAutonomousSendTick } from "@/lib/campaigns/autonomous";
import { captureError } from "@/lib/observability";

/**
 * Called on a schedule by an external cron (Vercel Cron, a scheduled
 * GitHub Actions workflow, or any host's job scheduler — see
 * DEPLOYMENT.md). There's no session here since it's machine-to-machine,
 * so it fails closed: without CRON_SECRET configured, this refuses to
 * run rather than being an unauthenticated endpoint anyone could call to
 * trigger real sends.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Autonomous sending is not configured." }, { status: 501 });
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const result = await runAutonomousSendTick();
    return NextResponse.json(result);
  } catch (error) {
    captureError("cron.autonomous-send", error);
    return NextResponse.json({ error: "Tick failed." }, { status: 500 });
  }
}
