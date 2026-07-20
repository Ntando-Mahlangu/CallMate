import { describe, it, expect } from "vitest";
import { applyProspectFilters, DEFAULT_PROSPECT_FILTERS, type ProspectFilters } from "./filter-bar";

type TestCompany = {
  id: string;
  category: string | null;
  rating: number | null;
  reviewCount: number | null;
  website: string | null;
  isSaved: boolean;
};

function company(overrides: Partial<TestCompany> = {}): TestCompany {
  return {
    id: "1",
    category: "Plumber",
    rating: 4.5,
    reviewCount: 25,
    website: "https://example.com",
    isSaved: false,
    ...overrides,
  };
}

function filters(overrides: Partial<ProspectFilters> = {}): ProspectFilters {
  return { ...DEFAULT_PROSPECT_FILTERS, ...overrides };
}

describe("applyProspectFilters", () => {
  it("passes everything through with default filters", () => {
    const companies = [company(), company({ id: "2", website: null, isSaved: true })];
    expect(applyProspectFilters(companies, filters())).toHaveLength(2);
  });

  it("filters by category", () => {
    const companies = [
      company({ id: "1", category: "Plumber" }),
      company({ id: "2", category: "HVAC" }),
    ];
    const result = applyProspectFilters(companies, filters({ category: "HVAC" }));
    expect(result.map((c) => c.id)).toEqual(["2"]);
  });

  it("filters by minimum rating", () => {
    const companies = [
      company({ id: "1", rating: 4.8 }),
      company({ id: "2", rating: 2.0 }),
    ];
    expect(applyProspectFilters(companies, filters({ minRating: 4 })).map((c) => c.id)).toEqual(["1"]);
  });

  it("filters by minimum review count", () => {
    const companies = [
      company({ id: "1", reviewCount: 100 }),
      company({ id: "2", reviewCount: 5 }),
    ];
    expect(
      applyProspectFilters(companies, filters({ minReviewCount: 50 })).map((c) => c.id),
    ).toEqual(["1"]);
  });

  it("filters by website presence", () => {
    const companies = [
      company({ id: "1", website: "https://example.com" }),
      company({ id: "2", website: null }),
    ];
    expect(applyProspectFilters(companies, filters({ website: "has" })).map((c) => c.id)).toEqual([
      "1",
    ]);
    expect(applyProspectFilters(companies, filters({ website: "none" })).map((c) => c.id)).toEqual([
      "2",
    ]);
  });

  it("filters to saved only", () => {
    const companies = [
      company({ id: "1", isSaved: true }),
      company({ id: "2", isSaved: false }),
    ];
    expect(applyProspectFilters(companies, filters({ savedOnly: true })).map((c) => c.id)).toEqual([
      "1",
    ]);
  });
});
