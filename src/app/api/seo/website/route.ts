import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/session";
import { getCurrentOrganization } from "@/lib/org";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const organization = await getCurrentOrganization(session.user.id);
  if (!organization) {
    return NextResponse.json({ error: "No workspace found." }, { status: 404 });
  }

  const { website } = await request.json();
  if (typeof website !== "string") {
    return NextResponse.json({ error: "Invalid website." }, { status: 400 });
  }

  try {
    new URL(website);
  } catch {
    return NextResponse.json(
      { error: "Enter a full URL, including https://" },
      { status: 400 },
    );
  }

  await prisma.organization.update({
    where: { id: organization.id },
    data: { website },
  });

  return NextResponse.json({ website });
}
