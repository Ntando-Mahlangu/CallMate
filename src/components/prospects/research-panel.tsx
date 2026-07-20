"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import { Badge } from "@/components/ui/badge";
import type { CompanyResearchData } from "@/lib/prospects/research-schema";

export function ResearchPanel({
  companyId,
  initialResearch,
}: {
  companyId: string;
  initialResearch: CompanyResearchData | null;
}) {
  const [research, setResearch] = useState(initialResearch);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function runResearch() {
    setError(null);
    setIsLoading(true);
    try {
      const res = await fetch(`/api/prospects/${companyId}/research`, { method: "POST" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Something went wrong.");
      setResearch(body.company.research);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  }

  if (!research) {
    return (
      <div className="space-y-4">
        <FormError message={error} />
        <p className="text-sm text-[var(--color-text-secondary)]">
          Outrun hasn&apos;t researched this prospect yet. This builds a full
          profile — likely pain points, why they match, and a recommended
          contact angle — from the information available.
        </p>
        <Button onClick={runResearch} disabled={isLoading}>
          {isLoading ? "Researching…" : "Research This Company"}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <FormError message={error} />

      <div>
        <h3 className="mb-1 text-sm font-medium text-[var(--color-text-muted)]">
          Company Summary
        </h3>
        <p className="text-sm text-[var(--color-text-primary)]">{research.companySummary}</p>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-medium text-[var(--color-text-muted)]">
          Likely Pain Points
        </h3>
        <ul className="space-y-1.5">
          {research.likelyPainPoints.map((p) => (
            <li key={p.point} className="flex items-center gap-2 text-sm">
              <Badge tone={p.basis === "observed" ? "high" : "low"}>{p.basis}</Badge>
              <span className="text-[var(--color-text-secondary)]">{p.point}</span>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="mb-1 text-sm font-medium text-[var(--color-text-muted)]">
          Why They Match
        </h3>
        <ul className="list-inside list-disc space-y-1 text-sm text-[var(--color-text-secondary)]">
          {research.whyTheyMatch.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="mb-1 text-sm font-medium text-[var(--color-text-muted)]">
          Growth Opportunities
        </h3>
        <ul className="list-inside list-disc space-y-1 text-sm text-[var(--color-text-secondary)]">
          {research.growthOpportunities.map((o) => (
            <li key={o}>{o}</li>
          ))}
        </ul>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <h3 className="mb-1 text-sm font-medium text-[var(--color-text-muted)]">
            Recommended Contact Angle
          </h3>
          <p className="text-sm text-[var(--color-text-secondary)]">
            {research.recommendedContactAngle}
          </p>
        </div>
        <div>
          <h3 className="mb-1 text-sm font-medium text-[var(--color-text-muted)]">
            Suggested Decision Maker
          </h3>
          <p className="text-sm text-[var(--color-text-secondary)]">
            {research.suggestedDecisionMakerTitle} (inferred, not verified)
          </p>
        </div>
        <div>
          <h3 className="mb-1 text-sm font-medium text-[var(--color-text-muted)]">
            Website Observations
          </h3>
          <p className="text-sm text-[var(--color-text-secondary)]">
            {research.websiteObservations ?? "No website found."}
          </p>
        </div>
        <div>
          <h3 className="mb-1 text-sm font-medium text-[var(--color-text-muted)]">
            Social Presence
          </h3>
          <p className="text-sm text-[var(--color-text-secondary)]">
            {research.socialPresenceNote}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Badge tone={research.aiConfidence === "High" ? "high" : research.aiConfidence === "Medium" ? "medium" : "low"}>
          {research.aiConfidence} confidence
        </Badge>
        <span className="text-xs text-[var(--color-text-muted)]">
          {research.confidenceReason}
        </span>
      </div>

      <div className="rounded-[var(--radius-md)] border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/10 p-4">
        <p className="text-sm font-medium text-[var(--color-text-primary)]">Suggested Next Step</p>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          {research.suggestedNextStep}
        </p>
      </div>

      <Button variant="ghost" size="sm" onClick={runResearch} disabled={isLoading}>
        {isLoading ? "Refreshing…" : "Refresh Research"}
      </Button>
    </div>
  );
}
