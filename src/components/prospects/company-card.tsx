"use client";

import { useState } from "react";
import Link from "next/link";
import type { Company } from "@prisma/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScoreBadge } from "./score-badge";
import { AddToListMenu } from "./add-to-list-menu";

export function CompanyCard({ company }: { company: Company }) {
  const [isSaved, setIsSaved] = useState(company.isSaved);
  const [isToggling, setIsToggling] = useState(false);

  async function toggleSave() {
    setIsToggling(true);
    try {
      const res = await fetch(`/api/prospects/${company.id}/save`, { method: "POST" });
      const body = await res.json();
      if (res.ok) setIsSaved(body.isSaved);
    } finally {
      setIsToggling(false);
    }
  }

  return (
    <Card className="animate-fade-in">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium text-[var(--color-text-primary)]">{company.name}</p>
          <p className="text-sm text-[var(--color-text-secondary)]">
            {company.category ?? "Uncategorized"}
            {company.formattedAddress ? ` · ${company.formattedAddress}` : ""}
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <ScoreBadge label="Fit" score={company.fitScore ?? 0} />
        <ScoreBadge label="Confidence" score={company.confidenceScore ?? 0} />
      </div>

      {company.rating != null && (
        <p className="mt-2 text-xs text-[var(--color-text-muted)]">
          {company.rating}★ · {company.reviewCount ?? 0} reviews
        </p>
      )}

      <div className="mt-4 flex gap-2">
        <Link
          href={`/prospects/${company.id}`}
          className="text-sm text-[var(--color-accent)] hover:underline"
        >
          Research →
        </Link>
        <div className="ml-auto flex items-center gap-2">
          <AddToListMenu companyId={company.id} />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={toggleSave}
            disabled={isToggling}
          >
            {isSaved ? "Saved" : "Save"}
          </Button>
        </div>
      </div>
    </Card>
  );
}
