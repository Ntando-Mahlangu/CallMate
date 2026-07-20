import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { UserFacingError } from "@/lib/errors";
import {
  createApiKey,
  listApiKeys,
  revokeApiKey,
  resolveOrganizationForApiKey,
} from "./service";

describe("api-keys service (integration)", () => {
  let growthOrgId: string;
  let freeOrgId: string;

  beforeEach(async () => {
    const growthOrg = await prisma.organization.create({
      data: { name: "API Keys Test Org (Growth)", planTier: "GROWTH" },
    });
    growthOrgId = growthOrg.id;
    const freeOrg = await prisma.organization.create({
      data: { name: "API Keys Test Org (Free)", planTier: "FREE" },
    });
    freeOrgId = freeOrg.id;
  });

  afterEach(async () => {
    await prisma.organization.deleteMany({ where: { id: { in: [growthOrgId, freeOrgId] } } });
  });

  it("creates a key for an OWNER on a Growth-tier org and lists it back without the raw key", async () => {
    const created = await createApiKey(growthOrgId, "GROWTH", "user-1", "OWNER", "CRM sync");
    expect(created.rawKey.startsWith("ok_live_")).toBe(true);

    const keys = await listApiKeys(growthOrgId);
    expect(keys).toHaveLength(1);
    expect(keys[0]?.name).toBe("CRM sync");
    expect(keys[0]).not.toHaveProperty("keyHash");
    expect(keys[0]?.revokedAt).toBeNull();
  });

  it("rejects creation from a non-owner/admin role", async () => {
    await expect(createApiKey(growthOrgId, "GROWTH", "user-1", "MEMBER", "x")).rejects.toThrow(
      UserFacingError,
    );
  });

  it("rejects creation for a Free-tier org even for the owner", async () => {
    await expect(createApiKey(freeOrgId, "FREE", "user-1", "OWNER", "x")).rejects.toThrow(
      "API access is available on the Growth plan and above.",
    );
  });

  it("resolves the correct organization from a valid raw key", async () => {
    const created = await createApiKey(growthOrgId, "GROWTH", "user-1", "OWNER", "x");
    const resolved = await resolveOrganizationForApiKey(created.rawKey);
    expect(resolved?.organizationId).toBe(growthOrgId);
  });

  it("returns null for an unknown key", async () => {
    expect(await resolveOrganizationForApiKey("ok_live_does-not-exist")).toBeNull();
  });

  it("returns null for a revoked key even though it was once valid", async () => {
    const created = await createApiKey(growthOrgId, "GROWTH", "user-1", "OWNER", "x");
    await revokeApiKey(growthOrgId, created.id, "user-1", "OWNER");

    expect(await resolveOrganizationForApiKey(created.rawKey)).toBeNull();

    const keys = await listApiKeys(growthOrgId);
    expect(keys[0]?.revokedAt).not.toBeNull();
  });

  it("returns null for a still-active key once the org drops below the required tier", async () => {
    const created = await createApiKey(growthOrgId, "GROWTH", "user-1", "OWNER", "x");
    await prisma.organization.update({ where: { id: growthOrgId }, data: { planTier: "FREE" } });

    expect(await resolveOrganizationForApiKey(created.rawKey)).toBeNull();
  });

  it("rejects revocation from a non-owner/admin role", async () => {
    const created = await createApiKey(growthOrgId, "GROWTH", "user-1", "OWNER", "x");
    await expect(revokeApiKey(growthOrgId, created.id, "user-2", "MEMBER")).rejects.toThrow(
      UserFacingError,
    );
  });
});
