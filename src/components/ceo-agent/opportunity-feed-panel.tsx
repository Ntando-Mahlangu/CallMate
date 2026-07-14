"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { ImpactBadge, Badge } from "@/components/ui/badge";
import {
  sortOpportunities,
  type OpportunityFeedItem,
  type OpportunitySort,
} from "@/lib/ceo-agent/opportunity-feed";

const SORT_OPTIONS: { value: OpportunitySort; label: string }[] = [
  { value: "roi", label: "Highest ROI" },
  { value: "fastest", label: "Fastest Win" },
  { value: "lowest-effort", label: "Lowest Effort" },
  { value: "confidence", label: "Highest Confidence" },
];

export function OpportunityFeedPanel({ items }: { items: OpportunityFeedItem[] }) {
  const [sort, setSort] = useState<OpportunitySort>("roi");
  const sorted = useMemo(() => sortOpportunities(items, sort), [items, sort]);

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-medium text-[var(--color-text-primary)]">Opportunity Feed</h2>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as OpportunitySort)}
          className="h-9 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)]"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              Sort by: {opt.label}
            </option>
          ))}
        </select>
      </div>

      {sorted.length === 0 ? (
        <p className="mt-3 text-sm text-[var(--color-text-muted)]">
          Generate a Growth Blueprint or run an SEO analysis to populate your opportunity feed.
        </p>
      ) : (
        <ul className="mt-4 space-y-4">
          {sorted.map((item) => (
            <li
              key={item.id}
              className="border-b border-[var(--color-border)] pb-4 last:border-0 last:pb-0"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium text-[var(--color-text-primary)]">{item.title}</p>
                <div className="flex flex-wrap items-center gap-2">
                  {item.estimatedImpact && (
                    <ImpactBadge level={item.estimatedImpact} label={`${item.estimatedImpact} impact`} />
                  )}
                  {item.estimatedEffort && (
                    <Badge tone="accent">{item.estimatedEffort} effort</Badge>
                  )}
                  {item.confidence != null && <Badge tone="medium">{item.confidence}% confidence</Badge>}
                </div>
              </div>
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{item.description}</p>
              <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                {item.source} · {item.recommendedAction}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
