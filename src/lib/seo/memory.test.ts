import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { getSeoMemory } from "./memory";

const CATEGORY = {
  category: "Content",
  score: 50,
  reason: "r",
  suggestedFix: "f",
  estimatedEffort: "Low",
  estimatedImpact: "Low",
};

describe("getSeoMemory (integration)", () => {
  let organizationId: string;

  beforeEach(async () => {
    const org = await prisma.organization.create({ data: { name: "SEO Memory Test Org" } });
    organizationId = org.id;
  });

  afterEach(async () => {
    await prisma.organization.delete({ where: { id: organizationId } });
  });

  it("returns empty arrays when there's no history", async () => {
    const memory = await getSeoMemory(organizationId);
    expect(memory).toEqual({ priorKeywords: [], draftedContentKeywords: [] });
  });

  it("collects deduplicated keywords across every past analysis version", async () => {
    await prisma.seoAnalysis.create({
      data: {
        organizationId,
        version: 1,
        healthScore: 50,
        executiveSummary: "s",
        categories: [CATEGORY],
        quickWins: ["w"],
        keywordSuggestions: [
          { keyword: "emergency plumber", type: "Primary", searchIntent: "i", reason: "r" },
          { keyword: "24 hour plumber", type: "Secondary", searchIntent: "i", reason: "r" },
        ],
        contentIdeas: [],
      },
    });
    await prisma.seoAnalysis.create({
      data: {
        organizationId,
        version: 2,
        healthScore: 55,
        executiveSummary: "s",
        categories: [CATEGORY],
        quickWins: ["w"],
        keywordSuggestions: [
          { keyword: "emergency plumber", type: "Primary", searchIntent: "i", reason: "r" },
          { keyword: "drain cleaning near me", type: "Location", searchIntent: "i", reason: "r" },
        ],
        contentIdeas: [],
      },
    });

    const memory = await getSeoMemory(organizationId);
    expect(memory.priorKeywords.sort()).toEqual(
      ["emergency plumber", "24 hour plumber", "drain cleaning near me"].sort(),
    );
  });

  it("collects deduplicated target keywords from drafted content", async () => {
    await prisma.seoContentPiece.create({
      data: {
        organizationId,
        targetKeyword: "emergency plumber",
        title: "t",
        metaDescription: "m",
        body: "b",
      },
    });
    await prisma.seoContentPiece.create({
      data: {
        organizationId,
        targetKeyword: "emergency plumber",
        title: "t2",
        metaDescription: "m2",
        body: "b2",
      },
    });

    const memory = await getSeoMemory(organizationId);
    expect(memory.draftedContentKeywords).toEqual(["emergency plumber"]);
  });

  it("never leaks another organization's keywords or content", async () => {
    const otherOrg = await prisma.organization.create({ data: { name: "Other SEO Memory Org" } });
    try {
      await prisma.seoAnalysis.create({
        data: {
          organizationId: otherOrg.id,
          version: 1,
          healthScore: 50,
          executiveSummary: "s",
          categories: [CATEGORY],
          quickWins: ["w"],
          keywordSuggestions: [
            { keyword: "other business keyword", type: "Primary", searchIntent: "i", reason: "r" },
          ],
          contentIdeas: [],
        },
      });

      const memory = await getSeoMemory(organizationId);
      expect(memory.priorKeywords).toEqual([]);
    } finally {
      await prisma.organization.delete({ where: { id: otherOrg.id } });
    }
  });
});
