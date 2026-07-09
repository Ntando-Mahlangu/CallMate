import { NextResponse } from "next/server";
import { isGoogleAuthEnabled } from "@/lib/auth";

export function GET() {
  return NextResponse.json({ googleEnabled: isGoogleAuthEnabled });
}
