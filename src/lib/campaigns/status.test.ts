import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { setCampaignPaused } from "./status";
import { UserFacingError } from "@/lib/errors";

describe("setCampaignPaused (integration)", () => {
  let organizationId: string;
  let campaignId: string;

  beforeEach(async () => {
    const org = await prisma.organization.create({ data: { name: "Status Test Org" } });
    organizationId = org.id;
    const campaign = await prisma.campaign.create({
      data: {
        organizationId,
        name: "Status Test Campaign",
        objective: "Book calls",
        status: "READY",
      },
    });
    campaignId = campaign.id;
  });

  afterEach(async () => {
    await prisma.organization.delete({ where: { id: organizationId } });
  });

  it("pauses a READY campaign for a manager role", async () => {
    const updated = await setCampaignPaused(organizationId, "ADMIN", campaignId, true);
    expect(updated.status).toBe("PAUSED");
  });

  it("resumes a PAUSED campaign back to READY", async () => {
    await setCampaignPaused(organizationId, "OWNER", campaignId, true);
    const resumed = await setCampaignPaused(organizationId, "OWNER", campaignId, false);
    expect(resumed.status).toBe("READY");
  });

  it("rejects a non-manager role", async () => {
    await expect(setCampaignPaused(organizationId, "MEMBER", campaignId, true)).rejects.toThrow(
      UserFacingError,
    );
  });

  it("rejects pausing a campaign that isn't READY", async () => {
    await prisma.campaign.update({ where: { id: campaignId }, data: { status: "DRAFT" } });
    await expect(setCampaignPaused(organizationId, "OWNER", campaignId, true)).rejects.toThrow(
      "Only a launched campaign can be paused.",
    );
  });

  it("rejects resuming a campaign that isn't PAUSED", async () => {
    await expect(setCampaignPaused(organizationId, "OWNER", campaignId, false)).rejects.toThrow(
      "This campaign isn't paused.",
    );
  });

  it("rejects a campaign id from another organization", async () => {
    const otherOrg = await prisma.organization.create({ data: { name: "Other Status Org" } });
    try {
      await expect(setCampaignPaused(otherOrg.id, "OWNER", campaignId, true)).rejects.toThrow(
        "That campaign could not be found.",
      );
    } finally {
      await prisma.organization.delete({ where: { id: otherOrg.id } });
    }
  });
});
