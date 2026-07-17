import { describe, expect, it, afterEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { shouldAutoPauseForFailures, runAutonomousSendTick } from "./autonomous";

describe("shouldAutoPauseForFailures", () => {
  it("never pauses below the minimum sample size, even at 100% failure", () => {
    expect(shouldAutoPauseForFailures(1, 1)).toBe(false);
    expect(shouldAutoPauseForFailures(2, 2)).toBe(false);
  });

  it("pauses once the failure rate reaches 50% at the minimum sample size", () => {
    expect(shouldAutoPauseForFailures(3, 1)).toBe(false);
    expect(shouldAutoPauseForFailures(4, 2)).toBe(true);
  });

  it("pauses on a majority-failing larger run", () => {
    expect(shouldAutoPauseForFailures(10, 6)).toBe(true);
  });

  it("does not pause on a mostly-succeeding larger run", () => {
    expect(shouldAutoPauseForFailures(10, 2)).toBe(false);
  });

  it("does not pause when nothing was attempted", () => {
    expect(shouldAutoPauseForFailures(0, 0)).toBe(false);
  });
});

describe("runAutonomousSendTick (integration)", () => {
  let orgIds: string[] = [];

  afterEach(async () => {
    await prisma.organization.deleteMany({ where: { id: { in: orgIds } } });
    orgIds = [];
  });

  it("skips campaigns belonging to a soft-deleted organization", async () => {
    const deletedOrg = await prisma.organization.create({
      data: { name: "Autonomous Tick Test Org (deleted)", deletedAt: new Date() },
    });
    orgIds = [deletedOrg.id];

    const campaign = await prisma.campaign.create({
      data: {
        organizationId: deletedOrg.id,
        name: "Deleted Org Campaign",
        objective: "Test",
        status: "READY",
        autonomousSendEnabled: true,
      },
    });

    await runAutonomousSendTick();

    // runAutonomousSendForCampaign unconditionally stamps
    // lastAutonomousSendAt the moment it processes a campaign, before it
    // even checks for pending messages — so this staying null is proof
    // the deleted org's campaign was never touched by the tick at all,
    // regardless of how many other (unrelated) campaigns exist in the DB.
    const after = await prisma.campaign.findUniqueOrThrow({ where: { id: campaign.id } });
    expect(after.lastAutonomousSendAt).toBeNull();
  });
});
