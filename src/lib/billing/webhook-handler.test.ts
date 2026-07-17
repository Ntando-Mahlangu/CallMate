import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { AuditAction } from "@/lib/audit/log-audit-event";

// revalidateTag needs Next's request-scoped runtime (see
// src/lib/teams/delete-organization.test.ts for the same constraint).
vi.mock("next/cache", () => ({ revalidateTag: vi.fn() }));

// plans.ts resolves each tier's Paddle price ID from env vars at module
// load time, so every scenario stubs its own env and re-imports fresh —
// same pattern as plans.test.ts.
describe("handlePaymentEvent (integration)", () => {
  let organizationId: string;

  beforeEach(async () => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_PADDLE_STARTER_PRICE_ID", "pri_starter");
    vi.stubEnv("NEXT_PUBLIC_PADDLE_GROWTH_PRICE_ID", "pri_growth");
    vi.stubEnv("NEXT_PUBLIC_PADDLE_UNLIMITED_PRICE_ID", "pri_unlimited");

    const org = await prisma.organization.create({
      data: { name: "Webhook Handler Test Org", planTier: "FREE" },
    });
    organizationId = org.id;
  });

  afterEach(async () => {
    await prisma.organization.deleteMany({ where: { id: organizationId } });
    vi.unstubAllEnvs();
  });

  function subscriptionEvent(status: string, priceId: string | null, currentPeriodStart: Date | null = null) {
    return {
      kind: "subscription" as const,
      data: {
        organizationId,
        externalCustomerId: "ctm_1",
        externalSubscriptionId: "sub_1",
        status: status as never,
        priceId,
        currentPeriodStart,
      },
    };
  }

  it("sets planTier to GROWTH when the active subscription's price matches Growth", async () => {
    const { handlePaymentEvent } = await import("./webhook-handler");
    await handlePaymentEvent(subscriptionEvent("active", "pri_growth"));

    const org = await prisma.organization.findUniqueOrThrow({ where: { id: organizationId } });
    expect(org.planTier).toBe("GROWTH");
  });

  it("sets planTier to UNLIMITED when the active subscription's price matches Unlimited", async () => {
    const { handlePaymentEvent } = await import("./webhook-handler");
    await handlePaymentEvent(subscriptionEvent("active", "pri_unlimited"));

    const org = await prisma.organization.findUniqueOrThrow({ where: { id: organizationId } });
    expect(org.planTier).toBe("UNLIMITED");
  });

  it("falls back to STARTER and reports an error when an active subscription's price matches no tier", async () => {
    const observability = await import("@/lib/observability");
    const captureErrorSpy = vi.spyOn(observability, "captureError").mockImplementation(() => {});
    const { handlePaymentEvent } = await import("./webhook-handler");

    await handlePaymentEvent(subscriptionEvent("active", "pri_deleted_or_unknown"));

    const org = await prisma.organization.findUniqueOrThrow({ where: { id: organizationId } });
    expect(org.planTier).toBe("STARTER");
    expect(captureErrorSpy).toHaveBeenCalledWith(
      "billing.webhook.unresolved-price",
      expect.any(Error),
    );
  });

  it("sets planTier to FREE for a canceled subscription regardless of price", async () => {
    await prisma.organization.update({ where: { id: organizationId }, data: { planTier: "GROWTH" } });
    const { handlePaymentEvent } = await import("./webhook-handler");

    await handlePaymentEvent(subscriptionEvent("canceled", "pri_growth"));

    const org = await prisma.organization.findUniqueOrThrow({ where: { id: organizationId } });
    expect(org.planTier).toBe("FREE");
  });

  it("logs a BILLING_CHANGED audit event on a real tier transition", async () => {
    const { handlePaymentEvent } = await import("./webhook-handler");
    await handlePaymentEvent(subscriptionEvent("active", "pri_growth"));

    const logs = await prisma.auditLog.findMany({ where: { organizationId } });
    expect(logs).toHaveLength(1);
    expect(logs[0]?.action).toBe(AuditAction.BILLING_CHANGED);
    expect(logs[0]?.metadata).toMatchObject({ fromTier: "FREE", toTier: "GROWTH" });
  });
});
