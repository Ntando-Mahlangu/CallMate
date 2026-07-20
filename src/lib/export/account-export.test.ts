import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { buildAccountExport } from "./account-export";

describe("buildAccountExport (integration)", () => {
  let organizationId: string;
  let otherOrgId: string;

  beforeEach(async () => {
    const org = await prisma.organization.create({
      data: { name: "Account Export Test Org", planTier: "STARTER" },
    });
    organizationId = org.id;

    const otherOrg = await prisma.organization.create({
      data: { name: "Account Export Test Org (Other Tenant)" },
    });
    otherOrgId = otherOrg.id;

    await prisma.company.create({
      data: {
        organizationId,
        source: "manual",
        sourceId: "export-test-1",
        name: "Exportable Co",
        fitScore: 90,
      },
    });
    await prisma.company.create({
      data: {
        organizationId: otherOrgId,
        source: "manual",
        sourceId: "export-test-2",
        name: "Should Not Appear Co",
      },
    });
    await prisma.task.create({
      data: { organizationId, title: "Do the thing", description: "details", impact: "High" },
    });
  });

  afterEach(async () => {
    await prisma.organization.deleteMany({ where: { id: { in: [organizationId, otherOrgId] } } });
  });

  it("includes this organization's own data", async () => {
    const result = await buildAccountExport(organizationId);
    expect(result.organization.id).toBe(organizationId);
    expect(result.companies).toHaveLength(1);
    expect(result.companies[0]?.name).toBe("Exportable Co");
    expect(result.tasks).toHaveLength(1);
  });

  it("never includes another organization's data", async () => {
    const result = await buildAccountExport(organizationId);
    expect(result.companies.some((c) => c.name === "Should Not Appear Co")).toBe(false);
  });

  it("never exposes API key hashes even when keys exist", async () => {
    await prisma.apiKey.create({
      data: {
        organizationId,
        name: "Test key",
        keyPrefix: "ok_live_ab12",
        keyHash: "some-hash-value",
        createdByUserId: "user-1",
      },
    });
    const result = await buildAccountExport(organizationId);
    expect(result.apiKeys).toHaveLength(1);
    expect(result.apiKeys[0]).not.toHaveProperty("keyHash");
  });

  it("includes webhook endpoint metadata but never the encrypted secret", async () => {
    await prisma.webhookEndpoint.create({
      data: {
        organizationId,
        url: "https://example.com/hooks",
        secretEncrypted: "some-encrypted-secret-value",
        createdByUserId: "user-1",
      },
    });
    const result = await buildAccountExport(organizationId);
    expect(result.webhookEndpoints).toHaveLength(1);
    expect(result.webhookEndpoints[0]?.url).toBe("https://example.com/hooks");
    expect(result.webhookEndpoints[0]).not.toHaveProperty("secretEncrypted");
  });

  it("includes a top-level exportedAt timestamp", async () => {
    const result = await buildAccountExport(organizationId);
    expect(typeof result.exportedAt).toBe("string");
    expect(new Date(result.exportedAt).toString()).not.toBe("Invalid Date");
  });
});
