import type { MembershipRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { UserFacingError } from "@/lib/errors";
import { logAuditEvent, AuditAction } from "@/lib/audit/log-audit-event";
import { assertPubliclyRoutableUrl } from "@/lib/security/ssrf";
import { canManageWebhooks } from "@/lib/teams/permissions";
import { encryptSecret, generateWebhookSecret } from "./crypto";

const MAX_ENDPOINTS_PER_ORG = 5;

export async function registerWebhookEndpoint(
  organizationId: string,
  actingUserId: string,
  actingRole: MembershipRole,
  url: string,
): Promise<{ id: string; url: string; createdAt: Date; rawSecret: string }> {
  if (!canManageWebhooks(actingRole)) {
    throw new UserFacingError("Only workspace owners and admins can manage webhooks.");
  }

  let validatedUrl: URL;
  try {
    validatedUrl = assertPubliclyRoutableUrl(url);
  } catch (error) {
    throw new UserFacingError(error instanceof Error ? error.message : "That URL isn't valid.");
  }

  const activeCount = await prisma.webhookEndpoint.count({ where: { organizationId } });
  if (activeCount >= MAX_ENDPOINTS_PER_ORG) {
    throw new UserFacingError(
      `You can have at most ${MAX_ENDPOINTS_PER_ORG} webhook endpoints. Remove one before adding another.`,
    );
  }

  const rawSecret = generateWebhookSecret();
  const created = await prisma.webhookEndpoint.create({
    data: {
      organizationId,
      url: validatedUrl.toString(),
      secretEncrypted: encryptSecret(rawSecret),
      createdByUserId: actingUserId,
    },
  });

  await logAuditEvent(organizationId, AuditAction.WEBHOOK_ENDPOINT_CREATED, {
    actorUserId: actingUserId,
    metadata: { url: created.url },
  });

  return { id: created.id, url: created.url, createdAt: created.createdAt, rawSecret };
}

export async function listWebhookEndpoints(organizationId: string) {
  return prisma.webhookEndpoint.findMany({
    where: { organizationId },
    orderBy: { createdAt: "asc" },
    select: { id: true, url: true, enabled: true, createdAt: true },
  });
}

export async function deleteWebhookEndpoint(
  organizationId: string,
  endpointId: string,
  actingUserId: string,
  actingRole: MembershipRole,
) {
  if (!canManageWebhooks(actingRole)) {
    throw new UserFacingError("Only workspace owners and admins can manage webhooks.");
  }

  const endpoint = await prisma.webhookEndpoint.findFirst({
    where: { id: endpointId, organizationId },
  });
  if (!endpoint) {
    throw new UserFacingError("That webhook endpoint could not be found.");
  }

  await prisma.webhookEndpoint.delete({ where: { id: endpointId } });

  await logAuditEvent(organizationId, AuditAction.WEBHOOK_ENDPOINT_DELETED, {
    actorUserId: actingUserId,
    metadata: { url: endpoint.url },
  });
}
