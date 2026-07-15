"use client";

import { useState } from "react";
import { SelectablePill } from "@/components/ui/selectable-pill";
import { FormError } from "@/components/ui/form-error";
import { BRAND_VOICE_OPTIONS, type BrandVoice } from "@/lib/org/brand-voice";

export function BrandVoicePanel({
  initialVoice,
  canManage,
}: {
  initialVoice: BrandVoice | null;
  canManage: boolean;
}) {
  const [voice, setVoice] = useState<BrandVoice | null>(initialVoice);
  const [saved, setSaved] = useState<BrandVoice | null>(initialVoice);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function selectVoice(next: BrandVoice) {
    if (!canManage || isSaving) return;
    setVoice(next);
    setError(null);
    setIsSaving(true);
    try {
      const res = await fetch("/api/settings/brand-voice", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voice: next }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Something went wrong.");
      setSaved(next);
    } catch (err) {
      setVoice(saved);
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div>
      <p className="text-sm text-[var(--color-text-secondary)]">
        This tone is applied consistently across every AI-generated email, LinkedIn message, and
        call script (docs/outrun/07 &ldquo;BRAND VOICE&rdquo;). Without one set, outreach defaults
        to a professional and direct tone.
      </p>
      {!canManage && (
        <p className="mt-2 text-xs text-[var(--color-text-muted)]">
          Only workspace owners and admins can change this.
        </p>
      )}
      <div className="mt-4 flex flex-wrap gap-3">
        {BRAND_VOICE_OPTIONS.map((option) => (
          <SelectablePill
            key={option}
            label={option}
            selected={voice === option}
            onClick={() => selectVoice(option)}
          />
        ))}
      </div>
      <FormError message={error} />
    </div>
  );
}
