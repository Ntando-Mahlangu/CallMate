"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";

type LeadListSummary = { id: string; name: string };

export function BulkActionsBar({
  selectedIds,
  onClearSelection,
  onSaved,
  onRemove,
  removeLabel = "Remove from list",
}: {
  selectedIds: string[];
  onClearSelection: () => void;
  onSaved?: () => void;
  /** When provided (e.g. inside a Lead List), replaces "Add to list" with
   * a "Remove from list" action instead. */
  onRemove?: () => Promise<void> | void;
  removeLabel?: string;
}) {
  const [lists, setLists] = useState<LeadListSummary[] | null>(null);
  const [selectedListId, setSelectedListId] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/lead-lists")
      .then((res) => res.json())
      .then((body) => setLists(body.lists ?? []))
      .catch(() => setLists([]));
  }, []);

  async function handleAddToList() {
    if (!selectedListId) return;
    setIsBusy(true);
    setError(null);
    setStatus(null);
    try {
      await Promise.all(
        selectedIds.map((id) =>
          fetch(`/api/prospects/${id}/lists`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ leadListId: selectedListId }),
          }),
        ),
      );
      setStatus(`Added ${selectedIds.length} to list.`);
    } catch {
      setError("Something went wrong adding those to that list.");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleSave() {
    setIsBusy(true);
    setError(null);
    setStatus(null);
    try {
      const res = await fetch("/api/prospects/bulk-save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyIds: selectedIds }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Something went wrong.");
      setStatus(`Saved ${selectedIds.length}.`);
      onSaved?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleRemove() {
    if (!onRemove) return;
    setIsBusy(true);
    setError(null);
    setStatus(null);
    try {
      await onRemove();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleExport(format: "csv" | "pdf") {
    setIsBusy(true);
    setError(null);
    setStatus(null);
    try {
      const res = await fetch("/api/prospects/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyIds: selectedIds, format }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? "Export failed.");
      }
      const blob = await res.blob();
      const filename =
        /filename="([^"]+)"/.exec(res.headers.get("Content-Disposition") ?? "")?.[1] ??
        `prospects.${format}`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed.");
    } finally {
      setIsBusy(false);
    }
  }

  if (selectedIds.length === 0) return null;

  return (
    <div className="sticky top-0 z-10 flex flex-wrap items-center gap-3 rounded-[var(--radius-md)] border border-[var(--color-accent)]/40 bg-[var(--color-bg-secondary)] p-3">
      <span className="text-sm text-[var(--color-text-primary)]">
        {selectedIds.length} selected
      </span>

      <select
        value={selectedListId}
        onChange={(e) => setSelectedListId(e.target.value)}
        className="h-9 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card)] px-2 text-sm text-[var(--color-text-primary)]"
      >
        <option value="">Add to list…</option>
        {lists?.map((list) => (
          <option key={list.id} value={list.id}>
            {list.name}
          </option>
        ))}
      </select>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={handleAddToList}
        disabled={isBusy || !selectedListId}
      >
        Add
      </Button>

      <Button type="button" variant="secondary" size="sm" onClick={handleSave} disabled={isBusy}>
        Save selected
      </Button>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => handleExport("csv")}
        disabled={isBusy}
      >
        Export CSV
      </Button>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => handleExport("pdf")}
        disabled={isBusy}
      >
        Export PDF
      </Button>

      {onRemove && (
        <Button type="button" variant="ghost" size="sm" onClick={handleRemove} disabled={isBusy}>
          {removeLabel}
        </Button>
      )}

      <button
        type="button"
        onClick={onClearSelection}
        className="ml-auto text-xs text-[var(--color-text-muted)] hover:text-[var(--color-accent)]"
      >
        Clear selection
      </button>

      {status && <p className="w-full text-xs text-[var(--color-success)]">{status}</p>}
      {error && (
        <div className="w-full">
          <FormError message={error} />
        </div>
      )}
    </div>
  );
}
