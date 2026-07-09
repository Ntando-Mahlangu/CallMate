import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

const PROTECTED_PREFIXES = ["/welcome", "/dashboard", "/onboarding", "/blueprint"];

// Fast redirect based on cookie presence only. The actual session is
// re-verified server-side via auth.api.getSession() on every protected
// page — this proxy never grants access by itself.
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix),
  );
  if (!isProtected) return NextResponse.next();

  const sessionCookie = getSessionCookie(request);
  if (!sessionCookie) {
    const signInUrl = new URL("/sign-in", request.url);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/welcome/:path*",
    "/dashboard/:path*",
    "/onboarding/:path*",
    "/blueprint/:path*",
  ],
};
