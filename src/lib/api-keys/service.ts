import type { MembershipRole, PlanTier } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { UserFacingError } from "@/lib/errors";
import { logAuditEvent, AuditAction } from "@/lib/audit/log-audit-event";
import { isFeatureEnabled, FEATURE_FLAGS } from "@/lib/billing/feature-flags";
import { canManageApiKeys } from "@/lib/teams/permissions";
import { generateApiKey, hashApiKey } from "./crypto";

const MAX_ACTIVE_KEYS_PER_ORG = 10;

export async function createApiKey(
  organizationId: string,
  planTier: PlanTier,
  actingUserId: string,
  actingRole: MembershipRole,
  name: string,
): Promise<{ rawKey: string; id: string; name: string; keyPrefix: string; createdAt: Date }> {
  if (!canManageApiKeys(actingRole)) {
    throw new UserFacingError("Only workspace owners and admins can manage API keys.");
  }
  // Never trust the frontend (Article XII) — re-check the plan gate here
  // even though the UI already hides this behind the same flag, since a
  // downgraded org could otherwise keep minting keys via a direct request.
  if (!isFeatureEnabled(planTier, FEATURE_FLAGS.API_ACCESS, organizationId)) {
    throw new UserFacingError("API access is available on the Growth plan and above.");
  }

  const activeCount = await prisma.apiKey.count({ where: { organizationId, revokedAt: null } });
  if (activeCount >= MAX_ACTIVE_KEYS_PER_ORG) {
    throw new UserFacingError(
      `You can have at most ${MAX_ACTIVE_KEYS_PER_ORG} active API keys. Revoke one before creating another.`,
    );
  }

  const { rawKey, hash, displayPrefix } = generateApiKey();

  const created = await prisma.apiKey.create({
    data: {
      organizationId,
      name,
      keyHash: hash,
      keyPrefix: displayPrefix,
      createdByUserId: actingUserId,
    },
  });

  await logAuditEvent(organizationId, AuditAction.API_KEY_CREATED, {
    actorUserId: actingUserId,
    metadata: { name, keyPrefix: displayPrefix },
  });

  return { rawKey, id: created.id, name: created.name, keyPrefix: created.keyPrefix, createdAt: created.createdAt };
}

export async function listApiKeys(organizationId: string) {
  return prisma.apiKey.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      createdAt: true,
      lastUsedAt: true,
      revokedAt: true,
    },
  });
}

export async function revokeApiKey(
  organizationId: string,
  keyId: string,
  actingUserId: string,
  actingRole: MembershipRole,
) {
  if (!canManageApiKeys(actingRole)) {
    throw new UserFacingError("Only workspace owners and admins can manage API keys.");
  }

  const key = await prisma.apiKey.findFirst({ where: { id: keyId, organizationId } });
  if (!key) {
    throw new UserFacingError("That API key could not be found.");
  }
  if (key.revokedAt) {
    return key;
  }

  const revoked = await prisma.apiKey.update({
    where: { id: keyId },
    data: { revokedAt: new Date() },
  });

  await logAuditEvent(organizationId, AuditAction.API_KEY_REVOKED, {
    actorUserId: actingUserId,
    metadata: { name: key.name, keyPrefix: key.keyPrefix },
  });

  return revoked;
}

/**
 * The public API's entire auth path: hash the presented key, look up a
 * live (non-revoked) match, and re-check the plan gate at request time —
 * a key issued while on Growth must stop working the moment the org drops
 * back to Free/Starter, not just stop being issuable.
 */
export async function resolveOrganizationForApiKey(
  rawKey: string,
): Promise<{ organizationId: string } | null> {
  const hash = hashApiKey(rawKey);
  const key = await prisma.apiKey.findUnique({
    where: { keyHash: hash },
    select: { id: true, organizationId: true, revokedAt: true, organization: { select: { planTier: true, deletedAt: true } } },
  });
  if (!key || key.revokedAt || key.organization.deletedAt) return null;
  if (!isFeatureEnabled(key.organization.planTier, FEATURE_FLAGS.API_ACCESS, key.organizationId)) {
    return null;
  }

  await prisma.apiKey.update({ where: { id: key.id }, data: { lastUsedAt: new Date() } }).catch(() => {});

  return { organizationId: key.organizationId };
}
