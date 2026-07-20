"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CampaignStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import { pollJob } from "@/lib/jobs/poll-job";

// docs/outrun/04 "each campaign card: View, Pause, Duplicate." Pause only
// applies to a launched (READY) campaign, Resume only to a PAUSED one;
// Duplicate re-runs the real generation pipeline for the same audience
// (src/lib/campaigns/duplicate.ts), so it can take a moment — same
// pattern as creating a campaign the first time.
export function CampaignActions({
  campaignId,
  status,
  canManage,
}: {
  campaignId: string;
  status: CampaignStatus;
  canManage: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);

  async function handleSetPaused(paused: boolean) {
    setError(null);
    setIsUpdatingStatus(true);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paused }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Something went wrong.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsUpdatingStatus(false);
    }
  }

  async function handleDuplicate() {
    setError(null);
    setIsDuplicating(true);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/duplicate`, { method: "POST" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Something went wrong.");
      const job = await pollJob(body.jobId, { timeoutMs: 280_000 });
      if (job.status === "FAILED" || !job.resultId) {
        throw new Error(job.errorMessage ?? "We couldn't duplicate this campaign.");
      }
      router.push(`/campaigns/${job.resultId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setIsDuplicating(false);
    }
  }

  if (!canManage) return null;

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex items-center gap-2">
        {status === "READY" && (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => handleSetPaused(true)}
            disabled={isUpdatingStatus || isDuplicating}
          >
            {isUpdatingStatus ? "Pausing…" : "Pause"}
          </Button>
        )}
        {status === "PAUSED" && (
          <Button
            size="sm"
            onClick={() => handleSetPaused(false)}
            disabled={isUpdatingStatus || isDuplicating}
          >
            {isUpdatingStatus ? "Resuming…" : "Resume"}
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          onClick={handleDuplicate}
          disabled={isUpdatingStatus || isDuplicating}
        >
          {isDuplicating ? "Duplicating…" : "Duplicate"}
        </Button>
      </div>
      <FormError message={error} />
    </div>
  );
}
