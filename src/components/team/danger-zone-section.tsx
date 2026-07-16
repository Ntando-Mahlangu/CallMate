"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";

// docs/outrun/12/15 "Soft Delete Support"/"Data deletion" — Owner-only
// (src/lib/teams/permissions.ts's canDeleteOrganization), requires typing
// the exact workspace name so it can't be triggered by an accidental
// click on something this destructive.
export function DangerZoneSection({ organizationName }: { organizationName: string }) {
  const router = useRouter();
  const [confirmName, setConfirmName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsDeleting(true);

    const res = await fetch("/api/team/delete-organization", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirmName }),
    });
    const body = await res.json();

    if (!res.ok) {
      setIsDeleting(false);
      setError(body.error ?? "We couldn't delete this workspace.");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <Card className="border-[var(--color-error)]/40">
      <h2 className="mb-1 text-lg font-medium text-[var(--color-error-text)]">Danger Zone</h2>
      <p className="mb-4 text-sm text-[var(--color-text-secondary)]">
        Deleting <strong>{organizationName}</strong> removes every member&apos;s access
        immediately. This cannot be undone from the app.
      </p>
      <form onSubmit={handleDelete} className="space-y-4">
        <FormError message={error} />
        <div className="space-y-2">
          <Label htmlFor="confirm-org-name">
            Type <strong>{organizationName}</strong> to confirm
          </Label>
          <Input
            id="confirm-org-name"
            value={confirmName}
            onChange={(e) => setConfirmName(e.target.value)}
            autoComplete="off"
          />
        </div>
        <Button
          type="submit"
          disabled={isDeleting || confirmName.trim() !== organizationName}
          className="border border-[var(--color-error)] bg-[var(--color-error)]/10 text-[var(--color-error-text)] hover:bg-[var(--color-error)]/20"
        >
          {isDeleting ? "Deleting…" : "Delete this workspace"}
        </Button>
      </form>
    </Card>
  );
}
