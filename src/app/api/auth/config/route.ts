import { NextResponse } from "next/server";
import { isGoogleAuthEnabled, isMicrosoftAuthEnabled } from "@/lib/auth";

export function GET() {
  return NextResponse.json({
    googleEnabled: isGoogleAuthEnabled,
    microsoftEnabled: isMicrosoftAuthEnabled,
  });
}
