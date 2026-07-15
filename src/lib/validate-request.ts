import { NextResponse } from "next/server";
import type { ZodType } from "zod";

/**
 * docs/outrun/15 "DEPLOYMENT PIPELINE" / CI/CD — every API route validates
 * its own request body today via ad-hoc `typeof x !== "..."` checks
 * scattered inline. This gives every route the same, type-safe Zod
 * parsing path without changing what the user sees: schemas should carry
 * their own custom messages (e.g. `z.string().min(1, "Give the task a
 * title.")`) so the returned error is the same friendly, field-specific
 * text every route already returned — never a raw Zod issue path.
 */
export async function parseJsonBody<T>(
  request: Request,
  schema: ZodType<T>,
): Promise<{ data: T; error?: undefined } | { data?: undefined; error: NextResponse }> {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return { error: NextResponse.json({ error: "Malformed request body." }, { status: 400 }) };
  }

  const result = schema.safeParse(json);
  if (!result.success) {
    const message = result.error.issues[0]?.message ?? "Invalid request.";
    return { error: NextResponse.json({ error: message }, { status: 400 }) };
  }

  return { data: result.data };
}
