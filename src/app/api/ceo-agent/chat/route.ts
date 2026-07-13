import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/session";
import { getCurrentOrganization } from "@/lib/org";
import { askCeoAgent } from "@/lib/ceo-agent/chat";

const GENERIC_ERROR =
  "The CEO Agent couldn't respond right now. Please try again in a moment.";

export async function POST(request: NextRequest) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const organization = await getCurrentOrganization(session.user.id);
  if (!organization) {
    return NextResponse.json({ error: "No workspace found for this account." }, { status: 404 });
  }

  const { message } = await request.json();
  if (typeof message !== "string" || !message.trim()) {
    return NextResponse.json({ error: "Type a question first." }, { status: 400 });
  }

  try {
    const reply = await askCeoAgent(organization.id, message.trim());
    return NextResponse.json({ reply });
  } catch (error) {
    console.error("CEO Agent chat failed:", error);
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 502 });
  }
}
