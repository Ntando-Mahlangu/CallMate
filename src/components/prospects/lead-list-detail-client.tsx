"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Company } from "@prisma/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormError } from "@/components/ui/form-error";
import { ScoreBadge } from "@/components/prospects/score-badge";

export function LeadListDetailClient({
  listId,
  initialName,
  initialCompanies,
}: {
  listId: string;
  initialName: string;
  initialCompanies: Company[];
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [savedName, setSavedName] = useState(initialName);
  const [isRenaming, setIsRenaming] = useState(false);
  const [companies, setCompanies] = useState(initialCompanies);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function rename() {
    setError(null);
    setIsRenaming(true);
    try {
      const res = await fetch(`/api/lead-lists/${listId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Something went wrong.");
      setSavedName(body.list.name);
      setName(body.list.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsRenaming(false);
    }
  }

  async function removeCompany(companyId: string) {
    setError(null);
    setRemovingId(companyId);
    try {
      const res = await fetch(`/api/prospects/${companyId}/lists`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadListId: listId }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Something went wrong.");
      setCompanies((prev) => prev.filter((c) => c.id !== companyId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setRemovingId(null);
    }
  }

  async function deleteList() {
    setError(null);
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/lead-lists/${listId}`, { method: "DELETE" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Something went wrong.");
      router.push("/prospects/lists");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setIsDeleting(false);
    }
  }

  return (
    <div className="animate-fade-in space-y-6">
      <Link href="/prospects/lists" className="text-sm text-[var(--color-accent)] hover:underline">
        ← Lists
      </Link>

      <Card>
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label className="text-sm font-medium text-[var(--color-text-secondary)]">
              List name
            </label>
            <div className="mt-2 flex gap-3">
              <Input value={name} onChange={(e) => setName(e.target.value)} />
              <Button
                variant="secondary"
                onClick={rename}
                disabled={isRenaming || !name.trim() || name.trim() === savedName}
              >
                {isRenaming ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
          <Button variant="ghost" onClick={deleteList} disabled={isDeleting}>
            {isDeleting ? "Deleting…" : "Delete List"}
          </Button>
        </div>
      </Card>

      <FormError message={error} />

      <div>
        <h2 className="text-lg font-medium text-[var(--color-text-primary)]">
          {companies.length} prospect{companies.length === 1 ? "" : "s"}
        </h2>
      </div>

      {companies.length === 0 ? (
        <p className="text-sm text-[var(--color-text-muted)]">
          No prospects in this list yet. Add some from the search page or a prospect&apos;s page.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {companies.map((company) => (
            <Card key={company.id} className="animate-fade-in">
              <p className="font-medium text-[var(--color-text-primary)]">{company.name}</p>
              <p className="text-sm text-[var(--color-text-secondary)]">
                {company.category ?? "Uncategorized"}
                {company.formattedAddress ? ` · ${company.formattedAddress}` : ""}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <ScoreBadge label="Fit" score={company.fitScore ?? 0} />
                <ScoreBadge label="Confidence" score={company.confidenceScore ?? 0} />
              </div>
              <div className="mt-4 flex gap-2">
                <Link
                  href={`/prospects/${company.id}`}
                  className="text-sm text-[var(--color-accent)] hover:underline"
                >
                  View →
                </Link>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="ml-auto"
                  onClick={() => removeCompany(company.id)}
                  disabled={removingId === company.id}
                >
                  {removingId === company.id ? "Removing…" : "Remove"}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
