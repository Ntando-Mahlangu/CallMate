import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { registerWebhookEndpoint } from "./service";
import { dispatchEvent, sweepPendingDeliveries } from "./dispatch";
import { decryptSecret, signPayload } from "./crypto";

describe("webhook dispatch (integration)", () => {
  let organizationId: string;

  // Explicit rather than relying on Prisma's own incidental .env loading
  // (see crypto.test.ts) — deriveKey() reads this directly.
  beforeAll(() => {
    vi.stubEnv("BETTER_AUTH_SECRET", "test-secret-for-webhook-dispatch-only");
  });
  afterAll(() => {
    vi.unstubAllEnvs();
  });

  beforeEach(async () => {
    const org = await prisma.organization.create({ data: { name: "Webhook Dispatch Test Org" } });
    organizationId = org.id;
  });

  afterEach(async () => {
    await prisma.organization.deleteMany({ where: { id: organizationId } });
    vi.restoreAllMocks();
  });

  it("enqueues a PENDING delivery per enabled endpoint without calling fetch", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    await registerWebhookEndpoint(organizationId, "user-1", "OWNER", "https://example.com/hooks/a");
    await registerWebhookEndpoint(organizationId, "user-1", "OWNER", "https://example.com/hooks/b");

    await dispatchEvent(organizationId, "CAMPAIGN_CREATED", { summary: "Campaign created" });

    expect(fetchSpy).not.toHaveBeenCalled();
    const deliveries = await prisma.webhookDelivery.findMany({
      where: { webhookEndpoint: { organizationId } },
    });
    expect(deliveries).toHaveLength(2);
    expect(deliveries.every((d) => d.status === "PENDING")).toBe(true);
  });

  it("does nothing when the organization has no webhook endpoints", async () => {
    await expect(dispatchEvent(organizationId, "CAMPAIGN_CREATED", {})).resolves.toBeUndefined();
    const deliveries = await prisma.webhookDelivery.findMany({
      where: { webhookEndpoint: { organizationId } },
    });
    expect(deliveries).toHaveLength(0);
  });

  it("marks a delivery DELIVERED on a successful sweep, signed with the endpoint's own secret", async () => {
    const endpoint = await registerWebhookEndpoint(organizationId, "user-1", "OWNER", "https://example.com/hooks");
    await dispatchEvent(organizationId, "CAMPAIGN_CREATED", { summary: "Campaign created" });

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 200 }));

    const result = await sweepPendingDeliveries();
    expect(result.attempted).toBe(1);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [, init] = fetchSpy.mock.calls[0]!;
    const headers = init?.headers as Record<string, string>;
    const body = init?.body as string;
    const row = await prisma.webhookEndpoint.findUniqueOrThrow({ where: { id: endpoint.id } });
    expect(headers["X-Outrun-Signature"]).toBe(signPayload(decryptSecret(row.secretEncrypted), body));
    expect(headers["X-Outrun-Event"]).toBe("CAMPAIGN_CREATED");

    const delivery = await prisma.webhookDelivery.findFirstOrThrow({
      where: { webhookEndpointId: endpoint.id },
    });
    expect(delivery.status).toBe("DELIVERED");
    expect(delivery.attempts).toBe(1);
    expect(delivery.deliveredAt).not.toBeNull();
  });

  it("schedules a retry with a future nextAttemptAt on failure, without dead-lettering immediately", async () => {
    await registerWebhookEndpoint(organizationId, "user-1", "OWNER", "https://example.com/hooks");
    await dispatchEvent(organizationId, "CAMPAIGN_CREATED", {});
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 500 }));

    await sweepPendingDeliveries();

    const delivery = await prisma.webhookDelivery.findFirstOrThrow({
      where: { webhookEndpoint: { organizationId } },
    });
    expect(delivery.status).toBe("PENDING");
    expect(delivery.attempts).toBe(1);
    expect(delivery.lastError).toContain("500");
    expect(delivery.nextAttemptAt.getTime()).toBeGreaterThan(Date.now());
  });

  it("moves a delivery to DEAD_LETTER once the retry ceiling is exceeded", async () => {
    await registerWebhookEndpoint(organizationId, "user-1", "OWNER", "https://example.com/hooks");
    await dispatchEvent(organizationId, "CAMPAIGN_CREATED", {});
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 500 }));

    const delivery = await prisma.webhookDelivery.findFirstOrThrow({
      where: { webhookEndpoint: { organizationId } },
    });
    // Fast-forward past every retry's backoff window and re-run the sweep
    // until it dead-letters, instead of waiting on real wall-clock time.
    for (let i = 0; i < 6; i++) {
      await prisma.webhookDelivery.update({
        where: { id: delivery.id },
        data: { nextAttemptAt: new Date(0) },
      });
      await sweepPendingDeliveries();
    }

    const final = await prisma.webhookDelivery.findUniqueOrThrow({ where: { id: delivery.id } });
    expect(final.status).toBe("DEAD_LETTER");
    expect(final.attempts).toBe(6);
  });

  it("skips a disabled endpoint's deliveries during the sweep", async () => {
    const endpoint = await registerWebhookEndpoint(organizationId, "user-1", "OWNER", "https://example.com/hooks");
    await dispatchEvent(organizationId, "CAMPAIGN_CREATED", {});
    await prisma.webhookEndpoint.update({ where: { id: endpoint.id }, data: { enabled: false } });

    const fetchSpy = vi.spyOn(globalThis, "fetch");
    await sweepPendingDeliveries();

    expect(fetchSpy).not.toHaveBeenCalled();
    const delivery = await prisma.webhookDelivery.findFirstOrThrow({ where: { webhookEndpointId: endpoint.id } });
    expect(delivery.status).toBe("PENDING");
  });
});
