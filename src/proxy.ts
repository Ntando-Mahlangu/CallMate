import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";
import { API_VERSION } from "@/lib/api-version";

const PROTECTED_PREFIXES = [
  "/welcome",
  "/dashboard",
  "/onboarding",
  "/blueprint",
  "/prospects",
  "/campaigns",
  "/memory",
  "/ceo-agent",
  "/seo",
  "/settings",
  "/billing",
];

// Fast redirect based on cookie presence only. The actual session is
// re-verified server-side via auth.api.getSession() on every protected
// page — this proxy never grants access by itself.
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // docs/outrun/11 "API DESIGN — Clear versioning." Stamped here rather
  // than in every route.ts so it can never drift on a route someone forgets
  // to update — every /api/* response carries it, including the ones
  // Better Auth's catch-all generates.
  if (pathname.startsWith("/api/")) {
    const response = NextResponse.next();
    response.headers.set("X-API-Version", API_VERSION);
    return response;
  }

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
    "/prospects/:path*",
    "/campaigns/:path*",
    "/memory/:path*",
    "/ceo-agent/:path*",
    "/seo/:path*",
    "/settings/:path*",
    "/billing/:path*",
    "/api/:path*",
  ],
};
