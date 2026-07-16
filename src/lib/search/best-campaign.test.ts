import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { findBestCampaign } from "./best-campaign";

describe("findBestCampaign (integration)", () => {
  let organizationId: string;
  let companyId: string;

  beforeEach(async () => {
    const org = await prisma.organization.create({ data: { name: "Best Campaign Test Org" } });
    organizationId = org.id;
    const company = await prisma.company.create({
      data: {
        organizationId,
        source: "google_places",
        sourceId: "best-campaign-test-1",
        name: "Best Campaign Test Co",
      },
    });
    companyId = company.id;
  });

  afterEach(async () => {
    await prisma.organization.delete({ where: { id: organizationId } });
  });

  async function makeCampaign(name: string, sent: boolean[]) {
    const campaign = await prisma.campaign.create({
      data: { organizationId, name, objective: "Test" },
    });
    for (const gotReply of sent) {
      await prisma.outreachMessage.create({
        data: {
          companyId,
          campaignId: campaign.id,
          subject: "Subject",
          body: "Body",
          openingRationale: "Rationale",
          sendStatus: "SENT",
          gotReply,
        },
      });
    }
    return campaign.id;
  }

  it("returns null when no campaign clears the minimum sent threshold", async () => {
    await makeCampaign("Too Small", [true, true]);
    expect(await findBestCampaign(organizationId)).toBeNull();
  });

  it("picks the campaign with the higher reply rate once both clear the minimum", async () => {
    await makeCampaign("Low Rate", [true, false, false, false]);
    const winnerId = await makeCampaign("High Rate", [true, true, true, false]);

    const result = await findBestCampaign(organizationId);
    expect(result?.id).toBe(winnerId);
    expect(result?.name).toBe("High Rate");
    expect(result?.replyRatePercent).toBe(75);
  });

  it("ignores unsent messages when computing reply rate", async () => {
    const campaign = await prisma.campaign.create({
      data: { organizationId, name: "Mixed Send Status", objective: "Test" },
    });
    for (const gotReply of [true, true, true]) {
      await prisma.outreachMessage.create({
        data: {
          companyId,
          campaignId: campaign.id,
          subject: "Subject",
          body: "Body",
          openingRationale: "Rationale",
          sendStatus: "SENT",
          gotReply,
        },
      });
    }
    // Unsent — should not count toward sentCount or the rate.
    await prisma.outreachMessage.create({
      data: {
        companyId,
        campaignId: campaign.id,
        subject: "Subject",
        body: "Body",
        openingRationale: "Rationale",
        sendStatus: "NOT_SENT",
        gotReply: false,
      },
    });

    const result = await findBestCampaign(organizationId);
    expect(result?.sentCount).toBe(3);
    expect(result?.replyRatePercent).toBe(100);
  });
});
