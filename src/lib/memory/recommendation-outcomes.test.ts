import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { getPriorRecommendationOutcomes } from "./recommendation-outcomes";

describe("getPriorRecommendationOutcomes (integration)", () => {
  let organizationId: string;

  beforeEach(async () => {
    const org = await prisma.organization.create({ data: { name: "Outcomes Test Org" } });
    organizationId = org.id;
  });

  afterEach(async () => {
    await prisma.organization.delete({ where: { id: organizationId } });
  });

  it("returns null when there is no history yet", async () => {
    const result = await getPriorRecommendationOutcomes(organizationId);
    expect(result).toBeNull();
  });

  it("summarizes completed, dismissed, and pending blueprint-sourced tasks", async () => {
    await prisma.task.create({
      data: {
        organizationId,
        title: "Set up email nurture sequence",
        description: "d",
        impact: "High",
        status: "COMPLETED",
        completionNotes: "Done, seeing early replies.",
        sourceBlueprintVersion: 1,
      },
    });
    await prisma.task.create({
      data: {
        organizationId,
        title: "Launch a referral program",
        description: "d",
        impact: "Medium",
        status: "DISMISSED",
        sourceBlueprintVersion: 1,
      },
    });
    await prisma.task.create({
      data: {
        organizationId,
        title: "Redesign homepage hero",
        description: "d",
        impact: "Low",
        status: "PENDING",
        sourceBlueprintVersion: 1,
      },
    });

    const result = await getPriorRecommendationOutcomes(organizationId);
    expect(result).toContain("1 completed, 1 dismissed, 1 still pending");
    expect(result).toContain("Set up email nurture sequence");
    expect(result).toContain("seeing early replies");
    expect(result).toContain("Launch a referral program");
  });

  it("ignores tasks with no sourceBlueprintVersion (manually-added tasks)", async () => {
    await prisma.task.create({
      data: {
        organizationId,
        title: "Manual task",
        description: "d",
        impact: "Low",
        status: "COMPLETED",
      },
    });

    const result = await getPriorRecommendationOutcomes(organizationId);
    expect(result).toBeNull();
  });

  it("includes Opportunity Feed feedback ratings", async () => {
    await prisma.recommendationFeedback.create({
      data: {
        organizationId,
        itemId: "seo-1-0",
        itemTitle: "Add alt text to product images",
        rating: "NOT_HELPFUL",
      },
    });

    const result = await getPriorRecommendationOutcomes(organizationId);
    expect(result).toContain("Not Helpful");
    expect(result).toContain("Add alt text to product images");
  });
});
