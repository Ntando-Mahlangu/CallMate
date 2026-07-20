import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import { getCurrentSession } from "@/lib/session";
import { getCurrentOrganization } from "@/lib/org";
import { orgProfileTag } from "@/lib/cache-tags";
import { prisma } from "@/lib/prisma";
import { parseJsonBody } from "@/lib/validate-request";

const updateWebsiteSchema = z.object({
  website: z.string({ message: "Invalid website." }),
});

export async function POST(request: NextRequest) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const organization = await getCurrentOrganization(session.user.id);
  if (!organization) {
    return NextResponse.json({ error: "No workspace found." }, { status: 404 });
  }

  const parsed = await parseJsonBody(request, updateWebsiteSchema);
  if (parsed.error) return parsed.error;
  const { website } = parsed.data;

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
  revalidateTag(orgProfileTag(organization.id), "max");

  return NextResponse.json({ website });
}
