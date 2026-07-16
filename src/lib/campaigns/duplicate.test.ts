import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { buildDuplicatePayload } from "./duplicate";
import { UserFacingError } from "@/lib/errors";

describe("buildDuplicatePayload (integration)", () => {
  let organizationId: string;

  beforeEach(async () => {
    const org = await prisma.organization.create({ data: { name: "Duplicate Test Org" } });
    organizationId = org.id;
  });

  afterEach(async () => {
    await prisma.organization.delete({ where: { id: organizationId } });
  });

  async function seedCompany(sourceId: string) {
    return prisma.company.create({
      data: {
        organizationId,
        source: "google_places",
        sourceId,
        name: `Duplicate Test Co ${sourceId}`,
      },
    });
  }

  it("builds a payload with the unique companies and reviewed strategy from a fully-formed campaign", async () => {
    const companyA = await seedCompany("dup-a");
    const companyB = await seedCompany("dup-b");
    const campaign = await prisma.campaign.create({
      data: {
        organizationId,
        name: "Original Campaign",
        objective: "Book calls",
        status: "READY",
        audienceSource: "Manual Selection",
        strategyRationale: "Cold email fits this audience.",
        strategyConfidence: "High",
        strategyChannel: "Cold Email",
        strategyStrengths: ["Direct", "Cheap"],
        strategyWeaknesses: ["Slow replies"],
      },
    });
    await prisma.outreachMessage.create({
      data: {
        companyId: companyA.id,
        campaignId: campaign.id,
        subject: "Hi",
        body: "Body",
        openingRationale: "Rationale",
      },
    });
    await prisma.outreachMessage.create({
      data: {
        companyId: companyB.id,
        campaignId: campaign.id,
        subject: "Hi",
        body: "Body",
        openingRationale: "Rationale",
      },
    });

    const payload = await buildDuplicatePayload(organizationId, "OWNER", campaign.id);

    expect(payload.name).toBe("Original Campaign (Copy)");
    expect(payload.objective).toBe("Book calls");
    expect(payload.companyIds.sort()).toEqual([companyA.id, companyB.id].sort());
    expect(payload.abTest).toBe(false);
    expect(payload.audienceSource).toBe("Manual Selection");
    expect(payload.strategy).toEqual({
      rationale: "Cold email fits this audience.",
      confidence: "High",
      recommendedChannel: "Cold Email",
      expectedStrengths: ["Direct", "Cheap"],
      potentialWeaknesses: ["Slow replies"],
    });
  });

  it("detects A/B tests from variant labels", async () => {
    const company = await seedCompany("dup-ab");
    const campaign = await prisma.campaign.create({
      data: { organizationId, name: "AB Campaign", objective: "Book calls", status: "READY" },
    });
    await prisma.outreachMessage.create({
      data: {
        companyId: company.id,
        campaignId: campaign.id,
        subject: "Hi",
        body: "Body",
        openingRationale: "Rationale",
        variantLabel: "A",
      },
    });

    const payload = await buildDuplicatePayload(organizationId, "OWNER", campaign.id);
    expect(payload.abTest).toBe(true);
  });

  it("falls back to no strategy when the persisted strategy is incomplete", async () => {
    const company = await seedCompany("dup-nostrategy");
    const campaign = await prisma.campaign.create({
      data: { organizationId, name: "No Strategy Campaign", objective: "Book calls", status: "READY" },
    });
    await prisma.outreachMessage.create({
      data: {
        companyId: company.id,
        campaignId: campaign.id,
        subject: "Hi",
        body: "Body",
        openingRationale: "Rationale",
      },
    });

    const payload = await buildDuplicatePayload(organizationId, "OWNER", campaign.id);
    expect(payload.strategy).toBeUndefined();
    expect(payload.audienceSource).toBe("Manual Selection");
  });

  it("rejects a campaign with no messages", async () => {
    const campaign = await prisma.campaign.create({
      data: { organizationId, name: "Empty Campaign", objective: "Book calls", status: "DRAFT" },
    });
    await expect(buildDuplicatePayload(organizationId, "OWNER", campaign.id)).rejects.toThrow(
      "This campaign has no prospects to duplicate.",
    );
  });

  it("rejects a non-manager role", async () => {
    const campaign = await prisma.campaign.create({
      data: { organizationId, name: "Perm Campaign", objective: "Book calls", status: "READY" },
    });
    await expect(buildDuplicatePayload(organizationId, "VIEWER", campaign.id)).rejects.toThrow(
      UserFacingError,
    );
  });
});
