"use client";

import { useEffect, useMemo, useState } from "react";
import { ScoreBadge } from "@/components/prospects/score-badge";
import {
  FilterBar,
  DEFAULT_PROSPECT_FILTERS,
  applyProspectFilters,
  type ProspectFilters,
} from "@/components/prospects/filter-bar";

export type CompanyOption = {
  id: string;
  name: string;
  category: string | null;
  fitScore: number | null;
  fitReason: string | null;
  isSaved: boolean;
  rating: number | null;
  reviewCount: number | null;
  website: string | null;
  hasOutreach: boolean;
};

export type LeadListOption = { id: string; name: string; companies: CompanyOption[] };

// docs/outrun/07 STEP 2 "SELECT AUDIENCE". "Recent Searches" and
// "Imported Leads" are on the doc's list too, but neither has a real
// data source in this app — there's no import feature, and search
// results aren't grouped into distinguishable batches — so building
// tabs for them would either do nothing or fake a result set.
const TABS = ["AI Recommended", "Saved Lists", "Custom Filters", "Manual Selection"] as const;
type Tab = (typeof TABS)[number];

const AI_RECOMMENDED_MIN_FIT = 70;
const AI_RECOMMENDED_LIMIT = 50;

function CompanyCheckboxList({
  companies,
  selected,
  onToggle,
}: {
  companies: CompanyOption[];
  selected: Set<string>;
  onToggle: (id: string) => void;
}) {
  if (companies.length === 0) {
    return (
      <p className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4 text-sm text-[var(--color-text-muted)]">
        No prospects match here.
      </p>
    );
  }

  return (
    <div className="max-h-96 space-y-2 overflow-y-auto">
      {companies.map((company) => (
        <label
          key={company.id}
          className="flex cursor-pointer items-center justify-between gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-4 py-3"
        >
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={selected.has(company.id)}
              onChange={() => onToggle(company.id)}
              className="size-4 accent-[var(--color-accent)]"
            />
            <div>
              <p className="text-sm font-medium text-[var(--color-text-primary)]">{company.name}</p>
              <p className="text-xs text-[var(--color-text-muted)]">
                {company.category ?? "Uncategorized"}
                {company.hasOutreach ? " · already contacted" : ""}
              </p>
            </div>
          </div>
          <ScoreBadge label="Fit" score={company.fitScore ?? 0} reason={company.fitReason} />
        </label>
      ))}
    </div>
  );
}

export function AudienceSourceTabs({
  companies,
  leadLists,
  selected,
  onChange,
  onSourceLabelChange,
}: {
  companies: CompanyOption[];
  leadLists: LeadListOption[];
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
  onSourceLabelChange: (label: string) => void;
}) {
  const [tab, setTab] = useState<Tab>("AI Recommended");
  const [activeListId, setActiveListId] = useState<string | null>(null);
  const [filters, setFilters] = useState<ProspectFilters>(DEFAULT_PROSPECT_FILTERS);

  const categories = useMemo(
    () => Array.from(new Set(companies.map((c) => c.category).filter((c): c is string => Boolean(c)))).sort(),
    [companies],
  );

  const aiRecommended = useMemo(
    () =>
      companies
        .filter((c) => (c.fitScore ?? 0) >= AI_RECOMMENDED_MIN_FIT && !c.hasOutreach)
        .sort((a, b) => (b.fitScore ?? 0) - (a.fitScore ?? 0))
        .slice(0, AI_RECOMMENDED_LIMIT),
    [companies],
  );

  const filteredByCustomFilters = useMemo(
    () => applyProspectFilters(companies, filters),
    [companies, filters],
  );

  // "AI Recommended" is the default tab, so its audience needs to be
  // selected as soon as the wizard reaches this step — not only after
  // the user clicks a tab (which is the only other place this list gets
  // applied to `selected`).
  useEffect(() => {
    onChange(new Set(aiRecommended.map((c) => c.id)));
    onSourceLabelChange("AI Recommended Prospects");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(next);
  }

  function selectTab(next: Tab) {
    setTab(next);
    if (next === "AI Recommended") {
      onChange(new Set(aiRecommended.map((c) => c.id)));
      onSourceLabelChange("AI Recommended Prospects");
    } else if (next === "Manual Selection") {
      onChange(new Set());
      onSourceLabelChange("Manual Selection");
    } else if (next === "Custom Filters") {
      onChange(new Set(filteredByCustomFilters.map((c) => c.id)));
      onSourceLabelChange("Custom Filters");
    } else {
      setActiveListId(null);
      onChange(new Set());
      onSourceLabelChange("Saved List");
    }
  }

  function selectList(list: LeadListOption) {
    setActiveListId(list.id);
    onChange(new Set(list.companies.map((c) => c.id)));
    onSourceLabelChange(`Saved List: ${list.name}`);
  }

  function updateFilters(next: ProspectFilters) {
    setFilters(next);
    onChange(new Set(applyProspectFilters(companies, next).map((c) => c.id)));
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2 border-b border-[var(--color-border)] pb-3">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => selectTab(t)}
            className={`rounded-[var(--radius-md)] px-3 py-1.5 text-sm transition-colors duration-100 ${
              tab === t
                ? "bg-[var(--color-accent)]/15 text-[var(--color-text-primary)]"
                : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {tab === "AI Recommended" && (
          <div className="space-y-3">
            <p className="text-sm text-[var(--color-text-secondary)]">
              Your highest-fit prospects that haven&apos;t been contacted yet, sorted by Fit Score.
            </p>
            <CompanyCheckboxList companies={aiRecommended} selected={selected} onToggle={toggle} />
          </div>
        )}

        {tab === "Saved Lists" && (
          <div className="space-y-3">
            {leadLists.length === 0 ? (
              <p className="text-sm text-[var(--color-text-muted)]">
                You don&apos;t have any saved lists yet. Build one from Prospects.
              </p>
            ) : (
              <>
                <div className="flex flex-wrap gap-2">
                  {leadLists.map((list) => (
                    <button
                      key={list.id}
                      type="button"
                      onClick={() => selectList(list)}
                      className={`rounded-[var(--radius-md)] border px-3 py-1.5 text-sm transition-colors duration-100 ${
                        activeListId === list.id
                          ? "border-[var(--color-accent)] bg-[var(--color-accent)]/15 text-[var(--color-text-primary)]"
                          : "border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-text-muted)]"
                      }`}
                    >
                      {list.name} ({list.companies.length} ready)
                    </button>
                  ))}
                </div>
                {activeListId && (
                  <CompanyCheckboxList
                    companies={leadLists.find((l) => l.id === activeListId)?.companies ?? []}
                    selected={selected}
                    onToggle={toggle}
                  />
                )}
              </>
            )}
          </div>
        )}

        {tab === "Custom Filters" && (
          <div className="space-y-3">
            <FilterBar categories={categories} filters={filters} onChange={updateFilters} />
            <CompanyCheckboxList
              companies={filteredByCustomFilters}
              selected={selected}
              onToggle={toggle}
            />
          </div>
        )}

        {tab === "Manual Selection" && (
          <CompanyCheckboxList companies={companies} selected={selected} onToggle={toggle} />
        )}
      </div>
    </div>
  );
}
