import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { captureError } from "@/lib/observability";

// This route must never reject a client error report — a malformed or
// partial payload is coerced to sane defaults (matching the previous
// silent-coercion behavior) rather than answered with a 400, since a
// rejected report just means the underlying render error goes unlogged.
const clientErrorSchema = z.object({
  message: z.string().catch("Unknown client error"),
  stack: z.string().optional().catch(undefined),
  digest: z.unknown(),
  url: z.unknown(),
});

/**
 * Reached only by src/app/global-error.tsx when a render error escapes
 * every error boundary — forwards it into the same capture pipeline as
 * every server-side catch block, so it shows up in one place.
 */
export async function POST(request: NextRequest) {
  const json = await request.json().catch(() => null);
  const result = clientErrorSchema.safeParse(json);
  const { message, stack, digest, url } = result.success
    ? result.data
    : { message: "Unknown client error", stack: undefined, digest: undefined, url: undefined };

  captureError(
    "client.render",
    Object.assign(new Error(message), {
      stack,
    }),
    { digest, url },
  );

  return NextResponse.json({ ok: true });
}
