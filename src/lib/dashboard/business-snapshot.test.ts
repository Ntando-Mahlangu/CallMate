import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { getBusinessSnapshot } from "./business-snapshot";

describe("getBusinessSnapshot pipeline value (integration)", () => {
  let organizationId: string;

  beforeEach(async () => {
    const org = await prisma.organization.create({ data: { name: "Snapshot Test Org" } });
    organizationId = org.id;
  });

  afterEach(async () => {
    await prisma.organization.delete({ where: { id: organizationId } });
  });

  async function seedCompanyWithContact(sourceId: string, relationshipStatus: "QUALIFIED" | "CUSTOMER" | "NEW") {
    const company = await prisma.company.create({
      data: { organizationId, source: "google_places", sourceId, name: `Snapshot Co ${sourceId}` },
    });
    await prisma.contact.create({
      data: { companyId: company.id, name: "Jane Doe", relationshipStatus },
    });
  }

  it("is null when avgCustomerValue isn't set, even with qualified contacts", async () => {
    await seedCompanyWithContact("snap-1", "QUALIFIED");
    const snapshot = await getBusinessSnapshot(organizationId);
    expect(snapshot.pipelineValue).toBeNull();
  });

  it("is null when avgCustomerValue is set but there are no qualified contacts", async () => {
    await prisma.businessProfile.create({
      data: {
        organizationId,
        description: "d",
        idealCustomer: "ic",
        sellingLocations: ["Local"],
        acquisitionChannels: [],
        growthChallenge: "g",
        avgCustomerValue: 5000,
        mainGoal: "m",
        competitors: [],
      },
    });
    await seedCompanyWithContact("snap-2", "NEW");
    await seedCompanyWithContact("snap-3", "CUSTOMER");
    const snapshot = await getBusinessSnapshot(organizationId);
    expect(snapshot.pipelineValue).toBeNull();
  });

  it("multiplies avgCustomerValue by the count of qualified contacts", async () => {
    await prisma.businessProfile.create({
      data: {
        organizationId,
        description: "d",
        idealCustomer: "ic",
        sellingLocations: ["Local"],
        acquisitionChannels: [],
        growthChallenge: "g",
        avgCustomerValue: 5000,
        mainGoal: "m",
        competitors: [],
      },
    });
    await seedCompanyWithContact("snap-4", "QUALIFIED");
    await seedCompanyWithContact("snap-5", "QUALIFIED");
    await seedCompanyWithContact("snap-6", "NEW");
    await seedCompanyWithContact("snap-7", "CUSTOMER");

    const snapshot = await getBusinessSnapshot(organizationId);
    expect(snapshot.pipelineValue).toEqual({ estimate: 10_000, qualifiedCount: 2, avgCustomerValue: 5000 });
    expect(snapshot.customersWon).toBe(1);
  });
});
