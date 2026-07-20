import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import { getCurrentSession } from "@/lib/session";
import { getCurrentOrganization } from "@/lib/org";
import { orgProfileTag } from "@/lib/cache-tags";
import { prisma } from "@/lib/prisma";
import { parseJsonBody } from "@/lib/validate-request";

const shareBlueprintSchema = z.object({
  enabled: z.boolean({ message: "Missing sharing preference." }),
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

  const parsed = await parseJsonBody(request, shareBlueprintSchema);
  if (parsed.error) return parsed.error;
  const { enabled } = parsed.data;

  const org = await prisma.organization.findUniqueOrThrow({ where: { id: organization.id } });
  const token = enabled ? (org.blueprintShareToken ?? crypto.randomUUID()) : org.blueprintShareToken;

  const updated = await prisma.organization.update({
    where: { id: organization.id },
    data: { blueprintShareEnabled: enabled, blueprintShareToken: token },
  });
  revalidateTag(orgProfileTag(organization.id), "max");

  return NextResponse.json({
    shareEnabled: updated.blueprintShareEnabled,
    shareToken: updated.blueprintShareToken,
  });
}
