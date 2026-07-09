"use client";

import { useState } from "react";
import type { Company } from "@prisma/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import { CompanyCard } from "@/components/prospects/company-card";

export default function ProspectsPage() {
  const [query, setQuery] = useState("");
  const [companies, setCompanies] = useState<Company[] | null>(null);
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsSearching(false);
    }
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-light tracking-tight text-[var(--color-text-primary)]">
          Find Prospects
        </h1>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          Describe who you&apos;re looking for in plain English.
        </p>
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
