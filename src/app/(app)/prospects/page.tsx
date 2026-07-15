"use client";

import { useState } from "react";
import type { Company } from "@prisma/client";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import { CompanyCard } from "@/components/prospects/company-card";

type Interpretation = { searchedFor: string; unsupportedIntents: string[] };

export default function ProspectsPage() {
  const [query, setQuery] = useState("");
  const [companies, setCompanies] = useState<Company[] | null>(null);
  const [interpretation, setInterpretation] = useState<Interpretation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSearching(true);

    try {
      const res = await fetch("/api/prospects/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Something went wrong.");
      setCompanies(body.companies);
      setInterpretation(body.interpretation ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsSearching(false);
    }
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-light tracking-tight text-[var(--color-text-primary)]">
            Find Prospects
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            Describe who you&apos;re looking for in plain English.
          </p>
        </div>
        <Link
          href="/prospects/lists"
          className="mt-1 text-sm text-[var(--color-accent)] hover:underline"
        >
          Your Lists →
        </Link>
      </div>

      <form onSubmit={handleSearch} className="flex gap-3">
        <Input
          placeholder="e.g. accounting firms in Chicago"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Button type="submit" disabled={isSearching}>
          {isSearching ? "Searching…" : "Search"}
        </Button>
      </form>

      <FormError message={error} />

      {interpretation && companies !== null && (
        <div className="text-sm text-[var(--color-text-secondary)]">
          <p>
            Searching for:{" "}
            <span className="text-[var(--color-text-primary)]">
              {interpretation.searchedFor}
            </span>
          </p>
          {interpretation.unsupportedIntents.length > 0 && (
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              Outrun can&apos;t yet verify: {interpretation.unsupportedIntents.join(", ")} —
              showing best-fit matches by what it can confirm.
            </p>
          )}
        </div>
      )}

      {companies === null && !error && (
        <p className="text-sm text-[var(--color-text-muted)]">
          Your search results will appear here, ranked by Fit Score.
        </p>
      )}

      {companies !== null && companies.length === 0 && !error && (
        <p className="text-sm text-[var(--color-text-muted)]">
          No matching businesses found. Try a broader description or a different
          location.
        </p>
      )}

      {companies && companies.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {companies.map((company) => (
            <CompanyCard key={company.id} company={company} />
          ))}
        </div>
      )}
    </div>
  );
}
