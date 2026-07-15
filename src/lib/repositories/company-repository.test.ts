import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { prisma } from "@/lib/prisma";
import * as companyRepository from "./company-repository";
import type { RawCompanyResult } from "@/lib/leads/types";
import type { LeadScore } from "@/lib/leads/scoring";

function searchResult(overrides: Partial<RawCompanyResult> = {}): RawCompanyResult {
  return {
    source: "google_places",
    sourceId: "repo-test-source-1",
    name: "Repo Test Plumbing",
    category: "Plumbing",
    website: "https://example.com",
    phone: "555-0100",
    formattedAddress: "1 Main St",
    rating: 4.2,
    reviewCount: 10,
    ...overrides,
  };
}

const score: LeadScore = {
  fitScore: 80,
  fitReason: "Great fit.",
  confidenceScore: 70,
  confidenceReason: "Has a website.",
};

describe("company-repository (integration)", () => {
  let organizationId: string;

  beforeEach(async () => {
    const org = await prisma.organization.create({ data: { name: "Company Repo Test Org" } });
    organizationId = org.id;
  });

  afterEach(async () => {
    await prisma.organization.delete({ where: { id: organizationId } });
  });

  it("upsertFromSearchResult creates a new company on first search", async () => {
    const company = await companyRepository.upsertFromSearchResult(organizationId, searchResult(), score);
    expect(company.name).toBe("Repo Test Plumbing");
    expect(company.fitScore).toBe(80);
    expect(company.fitReason).toBe("Great fit.");
  });

  it("upsertFromSearchResult updates the same row on a repeat search rather than duplicating it", async () => {
    await companyRepository.upsertFromSearchResult(organizationId, searchResult(), score);
    await companyRepository.upsertFromSearchResult(
      organizationId,
      searchResult({ name: "Repo Test Plumbing (Updated)", rating: 4.8 }),
      { ...score, fitScore: 90 },
    );

    const rows = await prisma.company.findMany({ where: { organizationId } });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.name).toBe("Repo Test Plumbing (Updated)");
    expect(rows[0]?.fitScore).toBe(90);
  });

  it("findByIdForOrg never returns another organization's company", async () => {
    const otherOrg = await prisma.organization.create({ data: { name: "Other Company Repo Org" } });
    try {
      const company = await companyRepository.upsertFromSearchResult(organizationId, searchResult(), score);
      const foundByOwner = await companyRepository.findByIdForOrg(organizationId, company.id);
      const foundByOther = await companyRepository.findByIdForOrg(otherOrg.id, company.id);
      expect(foundByOwner?.id).toBe(company.id);
      expect(foundByOther).toBeNull();
    } finally {
      await prisma.organization.delete({ where: { id: otherOrg.id } });
    }
  });

  it("findResearchedForOrg only returns companies with a research profile, sorted by fit score", async () => {
    const researched = await companyRepository.upsertFromSearchResult(
      organizationId,
      searchResult({ sourceId: "researched-1" }),
      { ...score, fitScore: 60 },
    );
    await companyRepository.updateResearch(researched.id, { note: "researched" });

    await companyRepository.upsertFromSearchResult(
      organizationId,
      searchResult({ sourceId: "unresearched-1", name: "Unresearched Co" }),
      { ...score, fitScore: 95 },
    );

    const results = await companyRepository.findResearchedForOrg(organizationId);
    expect(results).toHaveLength(1);
    expect(results[0]?.id).toBe(researched.id);
  });

  it("countResearchedForOrg counts only companies with research", async () => {
    const researched = await companyRepository.upsertFromSearchResult(
      organizationId,
      searchResult({ sourceId: "researched-2" }),
      score,
    );
    await companyRepository.updateResearch(researched.id, { note: "researched" });
    await companyRepository.upsertFromSearchResult(
      organizationId,
      searchResult({ sourceId: "unresearched-2" }),
      score,
    );

    expect(await companyRepository.countResearchedForOrg(organizationId)).toBe(1);
    expect(await companyRepository.countForOrg(organizationId)).toMatchObject({ _count: { id: 2 } });
  });

  it("setSaved toggles the isSaved flag", async () => {
    const company = await companyRepository.upsertFromSearchResult(organizationId, searchResult(), score);
    expect(company.isSaved).toBe(false);
    const updated = await companyRepository.setSaved(company.id, true);
    expect(updated.isSaved).toBe(true);
  });
});
