"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormError } from "@/components/ui/form-error";

const CATEGORIES: { value: string; label: string }[] = [
  { value: "COLD_OUTREACH", label: "Cold Outreach" },
  { value: "REFERRAL_REQUESTS", label: "Referral Requests" },
  { value: "PARTNERSHIPS", label: "Partnerships" },
  { value: "WEBSITE_AUDITS", label: "Website Audits" },
  { value: "CONSULTATION_OFFERS", label: "Consultation Offers" },
  { value: "PRODUCT_LAUNCHES", label: "Product Launches" },
];

export function SaveAsTemplateButton({
  defaultName,
  objective,
  abTest,
}: {
  defaultName: string;
  objective: string;
  abTest: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(defaultName);
  const [category, setCategory] = useState(CATEGORIES[0]!.value);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setError(null);
    setIsSaving(true);
    try {
      const res = await fetch("/api/campaign-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, category, objective, abTest }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Something went wrong.");
      setSaved(true);
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsSaving(false);
    }
  }

  if (saved) {
    return <span className="text-sm text-[var(--color-text-muted)]">✓ Saved to library</span>;
  }

  if (!open) {
    return (
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        Save as Template
      </Button>
    );
  }

  return (
    <div className="w-full space-y-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4">
      <FormError message={error} />
      <div>
        <label className="text-xs text-[var(--color-text-muted)]">Template name</label>
        <Input className="mt-1" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div>
        <label className="text-xs text-[var(--color-text-muted)]">Category</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="mt-1 h-11 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-4 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)]"
        >
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={save} disabled={isSaving || !name.trim()}>
          {isSaving ? "Saving…" : "Save Template"}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
