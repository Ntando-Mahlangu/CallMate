import { describe, it, expect } from "vitest";
import { applyPostFilters, type ParsedSearchQuery } from "./query-parser";
import type { RawCompanyResult } from "./types";

function company(overrides: Partial<RawCompanyResult> = {}): RawCompanyResult {
  return {
    source: "google_places",
    sourceId: "1",
    name: "Test Plumbing Co",
    category: "Plumber",
    website: "https://example.com",
    phone: "555-0100",
    formattedAddress: "123 Main St, Austin, TX",
    rating: 4.5,
    reviewCount: 25,
    ...overrides,
  };
}

function filters(overrides: Partial<ParsedSearchQuery["postFilters"]> = {}) {
  return {
    requireWebsite: null,
    requireNoWebsite: null,
    minRating: null,
    minReviewCount: null,
    ...overrides,
  };
}

describe("applyPostFilters", () => {
  it("passes everything through when no filters are set", () => {
    const results = [company(), company({ sourceId: "2", website: null })];
    expect(applyPostFilters(results, filters())).toHaveLength(2);
  });

  it("keeps only businesses without a website when requireNoWebsite is set", () => {
    const results = [
      company({ sourceId: "1", website: "https://example.com" }),
      company({ sourceId: "2", website: null }),
    ];
    const filtered = applyPostFilters(results, filters({ requireNoWebsite: true }));
    expect(filtered.map((r) => r.sourceId)).toEqual(["2"]);
  });

  it("keeps only businesses with a website when requireWebsite is set", () => {
    const results = [
      company({ sourceId: "1", website: "https://example.com" }),
      company({ sourceId: "2", website: null }),
    ];
    const filtered = applyPostFilters(results, filters({ requireWebsite: true }));
    expect(filtered.map((r) => r.sourceId)).toEqual(["1"]);
  });

  it("filters by minimum rating", () => {
    const results = [
      company({ sourceId: "1", rating: 4.8 }),
      company({ sourceId: "2", rating: 3.0 }),
      company({ sourceId: "3", rating: null }),
    ];
    const filtered = applyPostFilters(results, filters({ minRating: 4 }));
    expect(filtered.map((r) => r.sourceId)).toEqual(["1"]);
  });

  it("filters by minimum review count", () => {
    const results = [
      company({ sourceId: "1", reviewCount: 100 }),
      company({ sourceId: "2", reviewCount: 5 }),
      company({ sourceId: "3", reviewCount: null }),
    ];
    const filtered = applyPostFilters(results, filters({ minReviewCount: 50 }));
    expect(filtered.map((r) => r.sourceId)).toEqual(["1"]);
  });

  it("combines multiple filters", () => {
    const results = [
      company({ sourceId: "1", website: null, rating: 4.8 }),
      company({ sourceId: "2", website: null, rating: 2.0 }),
      company({ sourceId: "3", website: "https://example.com", rating: 4.8 }),
    ];
    const filtered = applyPostFilters(
      results,
      filters({ requireNoWebsite: true, minRating: 4 }),
    );
    expect(filtered.map((r) => r.sourceId)).toEqual(["1"]);
  });
});
