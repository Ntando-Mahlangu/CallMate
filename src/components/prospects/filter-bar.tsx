"use client";

export type ProspectFilters = {
  category: string;
  minRating: number;
  minReviewCount: number;
  website: "any" | "has" | "none";
  savedOnly: boolean;
};

export const DEFAULT_PROSPECT_FILTERS: ProspectFilters = {
  category: "",
  minRating: 0,
  minReviewCount: 0,
  website: "any",
  savedOnly: false,
};

// docs/outrun/06 "FILTERS" — only ones backed by real data on Company
// (category, rating, review count, website presence, saved status).
// Employee count, revenue, tech stack, funding, and hiring activity are
// listed in the spec too, but nothing in this schema or the lead-data
// provider carries those signals — building filter controls for them
// would either silently do nothing or fabricate a match.
export function FilterBar({
  categories,
  filters,
  onChange,
}: {
  categories: string[];
  filters: ProspectFilters;
  onChange: (next: ProspectFilters) => void;
}) {
  return (
    <div className="flex flex-wrap items-end gap-4 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4">
      <div className="space-y-1">
        <label className="text-xs text-[var(--color-text-muted)]" htmlFor="filter-category">
          Category
        </label>
        <select
          id="filter-category"
          value={filters.category}
          onChange={(e) => onChange({ ...filters, category: e.target.value })}
          className="h-9 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card)] px-2 text-sm text-[var(--color-text-primary)]"
        >
          <option value="">All</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label className="text-xs text-[var(--color-text-muted)]" htmlFor="filter-rating">
          Min rating
        </label>
        <select
          id="filter-rating"
          value={filters.minRating}
          onChange={(e) => onChange({ ...filters, minRating: Number(e.target.value) })}
          className="h-9 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card)] px-2 text-sm text-[var(--color-text-primary)]"
        >
          {[0, 3, 3.5, 4, 4.5].map((v) => (
            <option key={v} value={v}>
              {v === 0 ? "Any" : `${v}+`}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label className="text-xs text-[var(--color-text-muted)]" htmlFor="filter-reviews">
          Min reviews
        </label>
        <select
          id="filter-reviews"
          value={filters.minReviewCount}
          onChange={(e) => onChange({ ...filters, minReviewCount: Number(e.target.value) })}
          className="h-9 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card)] px-2 text-sm text-[var(--color-text-primary)]"
        >
          {[0, 10, 25, 50, 100].map((v) => (
            <option key={v} value={v}>
              {v === 0 ? "Any" : `${v}+`}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label className="text-xs text-[var(--color-text-muted)]" htmlFor="filter-website">
          Website
        </label>
        <select
          id="filter-website"
          value={filters.website}
          onChange={(e) =>
            onChange({ ...filters, website: e.target.value as ProspectFilters["website"] })
          }
          className="h-9 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card)] px-2 text-sm text-[var(--color-text-primary)]"
        >
          <option value="any">Any</option>
          <option value="has">Has website</option>
          <option value="none">No website</option>
        </select>
      </div>

      <label className="flex items-center gap-2 pb-2 text-sm text-[var(--color-text-secondary)]">
        <input
          type="checkbox"
          checked={filters.savedOnly}
          onChange={(e) => onChange({ ...filters, savedOnly: e.target.checked })}
          className="size-4 accent-[var(--color-accent)]"
        />
        Saved only
      </label>

      {JSON.stringify(filters) !== JSON.stringify(DEFAULT_PROSPECT_FILTERS) && (
        <button
          type="button"
          onClick={() => onChange(DEFAULT_PROSPECT_FILTERS)}
          className="pb-2 text-xs text-[var(--color-accent-text)] hover:underline"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}

export function applyProspectFilters<
  T extends {
    category: string | null;
    rating: number | null;
    reviewCount: number | null;
    website: string | null;
    isSaved: boolean;
  },
>(companies: T[], filters: ProspectFilters): T[] {
  return companies.filter((c) => {
    if (filters.category && c.category !== filters.category) return false;
    if ((c.rating ?? 0) < filters.minRating) return false;
    if ((c.reviewCount ?? 0) < filters.minReviewCount) return false;
    if (filters.website === "has" && !c.website) return false;
    if (filters.website === "none" && c.website) return false;
    if (filters.savedOnly && !c.isSaved) return false;
    return true;
  });
}
