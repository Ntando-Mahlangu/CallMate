"use client";

import { useState } from "react";
import type { RefundRequest } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { FormError } from "@/components/ui/form-error";

const STATUS_TONE = {
  PENDING: "medium",
  APPROVED: "high",
  DENIED: "low",
} as const;

export function RefundRequestPanel({
  canManage,
  initialRequests,
}: {
  canManage: boolean;
  initialRequests: RefundRequest[];
}) {
  const [requests, setRequests] = useState(initialRequests);
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/billing/refund-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Something went wrong.");
      setRequests((prev) => [body.request, ...prev]);
      setReason("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      {canManage && (
        <form onSubmit={submit} className="space-y-3">
          <label className="text-sm font-medium text-[var(--color-text-secondary)]">
            Request a refund
          </label>
          <p className="text-xs text-[var(--color-text-muted)]">
            Tell us why — every request is reviewed by our team, not processed automatically.
            We&apos;ll follow up by email.
          </p>
          <Textarea
            placeholder="What happened?"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <FormError message={error} />
          <Button type="submit" size="sm" disabled={isSubmitting || !reason.trim()}>
            {isSubmitting ? "Submitting…" : "Submit Request"}
          </Button>
        </form>
      )}

      {requests.length > 0 && (
        <div className="space-y-3">
          {requests.map((r) => (
            <div
              key={r.id}
              className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-3"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-[var(--color-text-muted)]">
                  {r.requestedByName} · {new Date(r.createdAt).toLocaleDateString()}
                </p>
                <Badge tone={STATUS_TONE[r.status]}>{r.status}</Badge>
              </div>
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{r.reason}</p>
              {r.resolutionNote && (
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                  Resolution: {r.resolutionNote}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
