"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import { SelectablePill } from "@/components/ui/selectable-pill";
import { ScoreBadge } from "@/components/prospects/score-badge";

const OBJECTIVES = [
  "Book meetings",
  "Generate leads",
  "Promote a service",
  "Request referrals",
  "Reconnect with past prospects",
  "Launch a new offer",
  "Free consultation",
  "Other",
];

type CompanyOption = {
  id: string;
  name: string;
  category: string | null;
  fitScore: number | null;
  isSaved: boolean;
};

export function NewCampaignForm({ companies }: { companies: CompanyOption[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [objective, setObjective] = useState("");
  const [objectiveOther, setObjectiveOther] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function toggleCompany(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  }

  const canSubmit =
    name.trim().length > 0 &&
    Boolean(objective && (objective !== "Other" || objectiveOther.trim())) &&
    selected.length > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          objective: objective === "Other" ? objectiveOther : objective,
          companyIds: selected,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Something went wrong.");
      router.push(`/campaigns/${body.campaignId}`);
    } catch (err) {
      setIsSubmitting(false);
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  if (isSubmitting) {
    return (
      <Card className="text-center">
        <div className="mx-auto mb-4 size-8 animate-pulse rounded-full bg-[var(--color-accent)]" />
        <p className="text-[var(--color-text-primary)]">
          Writing outreach for {selected.length} prospect{selected.length === 1 ? "" : "s"}…
        </p>
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">This can take a minute.</p>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <Label htmlFor="name">Campaign name</Label>
        <Input
          id="name"
          className="mt-2"
          placeholder="e.g. Q3 Accounting Firms Outreach"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </Card>

      <Card>
        <Label>Objective</Label>
        <div className="mt-3 flex flex-wrap gap-3">
          {OBJECTIVES.map((o) => (
            <SelectablePill
              key={o}
              label={o}
              selected={objective === o}
              onClick={() => setObjective(o)}
            />
          ))}
        </div>
        {objective === "Other" && (
          <Input
            className="mt-3"
            placeholder="Describe your objective…"
            value={objectiveOther}
            onChange={(e) => setObjectiveOther(e.target.value)}
          />
        )}
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <Label>Audience</Label>
          <span className="text-xs text-[var(--color-text-muted)]">
            {selected.length} selected
          </span>
        </div>
        <div className="mt-3 max-h-96 space-y-2 overflow-y-auto">
          {companies.map((company) => (
            <label
              key={company.id}
              className="flex cursor-pointer items-center justify-between gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={selected.includes(company.id)}
                  onChange={() => toggleCompany(company.id)}
                  className="size-4 accent-[var(--color-accent)]"
                />
                <div>
                  <p className="text-sm font-medium text-[var(--color-text-primary)]">
                    {company.name}
                  </p>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {company.category ?? "Uncategorized"}
                  </p>
                </div>
              </div>
              <ScoreBadge label="Fit" score={company.fitScore ?? 0} />
            </label>
          ))}
        </div>
      </Card>

      <FormError message={error} />

      <Button type="submit" disabled={!canSubmit || isSubmitting} className="w-full">
        Build Campaign
      </Button>
    </form>
  );
}
