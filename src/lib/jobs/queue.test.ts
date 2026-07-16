import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { shouldAlertForQueueDepth, sweepStuckJobs, QUEUE_DEPTH_ALERT_THRESHOLD } from "./queue";

describe("shouldAlertForQueueDepth", () => {
  it("does not alert below the threshold", () => {
    expect(shouldAlertForQueueDepth(QUEUE_DEPTH_ALERT_THRESHOLD - 1)).toBe(false);
  });

  it("alerts at or above the threshold", () => {
    expect(shouldAlertForQueueDepth(QUEUE_DEPTH_ALERT_THRESHOLD)).toBe(true);
    expect(shouldAlertForQueueDepth(QUEUE_DEPTH_ALERT_THRESHOLD + 1)).toBe(true);
  });
});

describe("sweepStuckJobs queue depth (integration)", () => {
  let organizationId: string;

  beforeEach(async () => {
    const org = await prisma.organization.create({ data: { name: "Queue Depth Test Org" } });
    organizationId = org.id;
  });

  afterEach(async () => {
    await prisma.organization.delete({ where: { id: organizationId } });
  });

  it("reports the current count of PENDING/RUNNING jobs and no alert when depth is low", async () => {
    await prisma.job.create({
      data: { organizationId, type: "SEO_ANALYSIS", payload: {}, status: "PENDING" },
    });
    await prisma.job.create({
      data: { organizationId, type: "SEO_ANALYSIS", payload: {}, status: "SUCCEEDED" },
    });

    const result = await sweepStuckJobs();
    expect(result.queueDepth).toBeGreaterThanOrEqual(1);
    expect(result.queueDepthAlert).toBe(false);
  });

  it("flags the alert once queue depth reaches the threshold", async () => {
    await prisma.job.createMany({
      data: Array.from({ length: QUEUE_DEPTH_ALERT_THRESHOLD }, () => ({
        organizationId,
        type: "SEO_ANALYSIS" as const,
        payload: {},
        status: "RUNNING" as const,
        startedAt: new Date(),
      })),
    });

    const result = await sweepStuckJobs();
    expect(result.queueDepth).toBeGreaterThanOrEqual(QUEUE_DEPTH_ALERT_THRESHOLD);
    expect(result.queueDepthAlert).toBe(true);
  });
});
