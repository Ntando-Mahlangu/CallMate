"use client";

import { useState } from "react";
import type { OutreachMessage } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import { Card } from "@/components/ui/card";

export function OutreachPanel({
  companyId,
  hasResearch,
  initialMessages,
}: {
  companyId: string;
  hasResearch: boolean;
  initialMessages: OutreachMessage[];
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  async function generate() {
    setError(null);
    setIsGenerating(true);
    try {
      const res = await fetch(`/api/prospects/${companyId}/outreach`, { method: "POST" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Something went wrong.");
      setMessages((prev) => [body.message, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsGenerating(false);
    }
  }

  if (!hasResearch) {
    return (
      <p className="text-sm text-[var(--color-text-muted)]">
        Research this prospect first — outreach is written from the research
        profile so it stays specific to them.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <FormError message={error} />
      <Button onClick={generate} disabled={isGenerating}>
        {isGenerating ? "Writing…" : messages.length ? "Generate Another Version" : "Generate Outreach"}
      </Button>

      <div className="space-y-4">
        {messages.map((message) => (
          <Card key={message.id} className="bg-[var(--color-bg-secondary)]">
            <p className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
              Subject
            </p>
            <p className="mb-3 text-sm font-medium text-[var(--color-text-primary)]">
              {message.subject}
            </p>
            <p className="whitespace-pre-wrap text-sm text-[var(--color-text-secondary)]">
              {message.body}
            </p>
            <p className="mt-3 text-xs text-[var(--color-text-muted)]">
              Why this opener: {message.openingRationale}
            </p>
          </Card>
        ))}
      </div>
    </div>
  );
}
