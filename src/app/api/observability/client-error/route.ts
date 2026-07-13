import { NextRequest, NextResponse } from "next/server";
import { captureError } from "@/lib/observability";

/**
 * Reached only by src/app/global-error.tsx when a render error escapes
 * every error boundary — forwards it into the same capture pipeline as
 * every server-side catch block, so it shows up in one place.
 */
export async function POST(request: NextRequest) {
  const { message, stack, digest, url } = await request.json();

  captureError(
    "client.render",
    Object.assign(new Error(typeof message === "string" ? message : "Unknown client error"), {
      stack: typeof stack === "string" ? stack : undefined,
    }),
    { digest, url },
  );

  return NextResponse.json({ ok: true });
}
