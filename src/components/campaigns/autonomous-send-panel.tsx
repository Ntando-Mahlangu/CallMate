"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import { Badge } from "@/components/ui/badge";

export function AutonomousSendPanel({
  campaignId,
  enabled: initialEnabled,
  dailyLimit: initialDailyLimit,
  lastRunAt,
  canManage,
  emailConfigured,
}: {
  campaignId: string;
  enabled: boolean;
  dailyLimit: number;
  lastRunAt: Date | null;
  canManage: boolean;
  emailConfigured: boolean;
}) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [dailyLimit, setDailyLimit] = useState(String(initialDailyLimit));
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function save(nextEnabled: boolean) {
    setError(null);
    setIsSaving(true);
    try {
      const limit = Number.parseInt(dailyLimit, 10);
      const res = await fetch(`/api/campaigns/${campaignId}/autonomous`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: nextEnabled, dailyLimit: limit }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Something went wrong.");
      setEnabled(body.campaign.autonomousSendEnabled);
      setDailyLimit(String(body.campaign.autonomousDailyLimit));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card>
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-medium text-[var(--color-text-primary)]">
          Autonomous Sending
        </h2>
        {enabled && <Badge tone="high">On</Badge>}
      </div>
      <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
        When on, newly-generated messages in this campaign send automatically instead of waiting
        for you to click Send — up to a daily cap you set. It never generates or launches a
        campaign on its own; it only sends what&apos;s already here.
      </p>

      {!canManage && (
        <p className="mt-3 text-xs text-[var(--color-text-muted)]">
          Only workspace owners and admins can change this setting.
        </p>
      )}

      {canManage && !emailConfigured && (
        <p className="mt-3 text-xs text-[var(--color-warning)]">
          Email sending isn&apos;t configured for this workspace yet — this can&apos;t be turned
          on until it is.
        </p>
      )}

      {canManage && (
        <div className="mt-4">
          <FormError message={error} />
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-sm text-[var(--color-text-secondary)]" htmlFor="daily-limit">
              Max sends per day
            </label>
            <Input
              id="daily-limit"
              type="number"
              min={1}
              max={500}
              value={dailyLimit}
              onChange={(e) => setDailyLimit(e.target.value)}
              disabled={isSaving}
              className="w-24"
            />
            {enabled ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => save(false)}
                disabled={isSaving}
              >
                Turn off
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={() => save(true)}
                disabled={isSaving || !emailConfigured}
              >
                {isSaving ? "Saving…" : "Turn on"}
              </Button>
            )}
            {enabled && (
              <Button size="sm" variant="ghost" onClick={() => save(true)} disabled={isSaving}>
                Update limit
              </Button>
            )}
          </div>
        </div>
      )}

      {enabled && (
        <p className="mt-3 text-xs text-[var(--color-text-muted)]">
          Last checked by a scheduled job:{" "}
          {lastRunAt
            ? new Date(lastRunAt).toLocaleString()
            : "never — make sure a scheduler is configured (see DEPLOYMENT.md), or nothing will send automatically."}
        </p>
      )}
    </Card>
  );
}
