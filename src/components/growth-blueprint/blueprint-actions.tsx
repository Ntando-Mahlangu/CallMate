"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";

export function BlueprintActions({
  hasHistory,
  initialShareEnabled,
  initialShareToken,
}: {
  hasHistory: boolean;
  initialShareEnabled: boolean;
  initialShareToken: string | null;
}) {
  const router = useRouter();
  const [shareEnabled, setShareEnabled] = useState(initialShareEnabled);
  const [shareToken, setShareToken] = useState(initialShareToken);
  const [isTogglingShare, setIsTogglingShare] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggleShare() {
    setError(null);
    setIsTogglingShare(true);
    try {
      const res = await fetch("/api/blueprint/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !shareEnabled }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Something went wrong.");
      setShareEnabled(body.shareEnabled);
      setShareToken(body.shareToken);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsTogglingShare(false);
    }
  }

  async function copyLink() {
    if (!shareToken) return;
    const url = `${window.location.origin}/share/blueprint/${shareToken}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function regenerate() {
    setError(null);
    setIsRegenerating(true);
    try {
      const res = await fetch("/api/blueprint/generate", { method: "POST" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Something went wrong.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsRegenerating(false);
    }
  }

  return (
    <div className="animate-fade-in space-y-3">
      <FormError message={error} />
      <div className="flex flex-wrap items-center justify-center gap-3">
        <a
          href="/api/blueprint/export?format=markdown"
          className="text-sm text-[var(--color-accent)] hover:underline"
        >
          Export Markdown
        </a>
        <a
          href="/api/blueprint/export?format=pdf"
          className="text-sm text-[var(--color-accent)] hover:underline"
        >
          Export PDF
        </a>
        <button
          type="button"
          onClick={() => window.print()}
          className="text-sm text-[var(--color-accent)] hover:underline"
        >
          Print
        </button>
        {hasHistory && (
          <Link href="/blueprint/history" className="text-sm text-[var(--color-accent)] hover:underline">
            Version History
          </Link>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={regenerate}
          disabled={isRegenerating}
        >
          {isRegenerating ? "Regenerating…" : "Regenerate Blueprint"}
        </Button>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3 text-sm">
        <label className="flex items-center gap-2 text-[var(--color-text-secondary)]">
          <input
            type="checkbox"
            checked={shareEnabled}
            onChange={toggleShare}
            disabled={isTogglingShare}
            className="size-4 accent-[var(--color-accent)]"
          />
          Enable shareable link
        </label>
        {shareEnabled && shareToken && (
          <button
            type="button"
            onClick={copyLink}
            className="text-[var(--color-accent)] hover:underline"
          >
            {copied ? "Copied!" : "Copy link"}
          </button>
        )}
      </div>
    </div>
  );
}
