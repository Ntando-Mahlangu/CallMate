import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { UserFacingError } from "@/lib/errors";
import {
  registerWebhookEndpoint,
  listWebhookEndpoints,
  deleteWebhookEndpoint,
  setWebhookEndpointEnabled,
} from "./service";

describe("webhooks service (integration)", () => {
  let organizationId: string;

  // Explicit rather than relying on Prisma's own incidental .env loading
  // (see crypto.test.ts) — registerWebhookEndpoint's encryptSecret call
  // reads BETTER_AUTH_SECRET directly.
  beforeAll(() => {
    vi.stubEnv("BETTER_AUTH_SECRET", "test-secret-for-webhooks-service-only");
  });
  afterAll(() => {
    vi.unstubAllEnvs();
  });

  beforeEach(async () => {
    const org = await prisma.organization.create({ data: { name: "Webhooks Test Org" } });
    organizationId = org.id;
  });

  afterEach(async () => {
    await prisma.organization.deleteMany({ where: { id: organizationId } });
  });

  it("registers an endpoint for an OWNER and lists it back without the secret", async () => {
    const created = await registerWebhookEndpoint(
      organizationId,
      "user-1",
      "OWNER",
      "https://example.com/hooks/outrun",
    );
    expect(created.rawSecret.startsWith("whsec_")).toBe(true);

    const endpoints = await listWebhookEndpoints(organizationId);
    expect(endpoints).toHaveLength(1);
    expect(endpoints[0]?.url).toBe("https://example.com/hooks/outrun");
    expect(endpoints[0]).not.toHaveProperty("secretEncrypted");
  });

  it("rejects registration from a non-owner/admin role", async () => {
    await expect(
      registerWebhookEndpoint(organizationId, "user-1", "MEMBER", "https://example.com/hooks"),
    ).rejects.toThrow(UserFacingError);
  });

  it("rejects a URL pointing at a private address", async () => {
    await expect(
      registerWebhookEndpoint(organizationId, "user-1", "OWNER", "http://localhost:3000/hooks"),
    ).rejects.toThrow(UserFacingError);
    await expect(
      registerWebhookEndpoint(organizationId, "user-1", "OWNER", "http://169.254.169.254/hooks"),
    ).rejects.toThrow(UserFacingError);
  });

  it("rejects a non-http(s) URL", async () => {
    await expect(
      registerWebhookEndpoint(organizationId, "user-1", "OWNER", "ftp://example.com/hooks"),
    ).rejects.toThrow(UserFacingError);
  });

  it("enforces a maximum number of endpoints per organization", async () => {
    for (let i = 0; i < 5; i++) {
      await registerWebhookEndpoint(organizationId, "user-1", "OWNER", `https://example.com/hooks/${i}`);
    }
    await expect(
      registerWebhookEndpoint(organizationId, "user-1", "OWNER", "https://example.com/hooks/6"),
    ).rejects.toThrow(/at most 5 webhook endpoints/);
  });

  it("deletes an endpoint owned by the organization", async () => {
    const created = await registerWebhookEndpoint(organizationId, "user-1", "OWNER", "https://example.com/hooks");
    await deleteWebhookEndpoint(organizationId, created.id, "user-1", "OWNER");
    expect(await listWebhookEndpoints(organizationId)).toHaveLength(0);
  });

  it("rejects deletion from a non-owner/admin role", async () => {
    const created = await registerWebhookEndpoint(organizationId, "user-1", "OWNER", "https://example.com/hooks");
    await expect(deleteWebhookEndpoint(organizationId, created.id, "user-2", "MEMBER")).rejects.toThrow(
      UserFacingError,
    );
  });

  it("rejects deleting an endpoint that doesn't belong to the organization", async () => {
    const otherOrg = await prisma.organization.create({ data: { name: "Other Org" } });
    try {
      const created = await registerWebhookEndpoint(otherOrg.id, "user-1", "OWNER", "https://example.com/hooks");
      await expect(
        deleteWebhookEndpoint(organizationId, created.id, "user-1", "OWNER"),
      ).rejects.toThrow("That webhook endpoint could not be found.");
    } finally {
      await prisma.organization.delete({ where: { id: otherOrg.id } });
    }
  });

  it("pauses an endpoint without touching its secret, then re-enables it", async () => {
    const created = await registerWebhookEndpoint(organizationId, "user-1", "OWNER", "https://example.com/hooks");
    const before = await prisma.webhookEndpoint.findUniqueOrThrow({ where: { id: created.id } });

    const disabled = await setWebhookEndpointEnabled(organizationId, created.id, "user-1", "OWNER", false);
    expect(disabled.enabled).toBe(false);
    expect(disabled.secretEncrypted).toBe(before.secretEncrypted);

    const reenabled = await setWebhookEndpointEnabled(organizationId, created.id, "user-1", "OWNER", true);
    expect(reenabled.enabled).toBe(true);
    expect(reenabled.secretEncrypted).toBe(before.secretEncrypted);
  });

  it("rejects toggling from a non-owner/admin role", async () => {
    const created = await registerWebhookEndpoint(organizationId, "user-1", "OWNER", "https://example.com/hooks");
    await expect(
      setWebhookEndpointEnabled(organizationId, created.id, "user-2", "MEMBER", false),
    ).rejects.toThrow(UserFacingError);
  });

  it("rejects toggling an endpoint that doesn't belong to the organization", async () => {
    const otherOrg = await prisma.organization.create({ data: { name: "Other Org (toggle)" } });
    try {
      const created = await registerWebhookEndpoint(otherOrg.id, "user-1", "OWNER", "https://example.com/hooks");
      await expect(
        setWebhookEndpointEnabled(organizationId, created.id, "user-1", "OWNER", false),
      ).rejects.toThrow("That webhook endpoint could not be found.");
    } finally {
      await prisma.organization.delete({ where: { id: otherOrg.id } });
    }
  });
});
