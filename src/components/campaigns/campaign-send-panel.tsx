"use client";

import { useState } from "react";
import Link from "next/link";
import type { OutreachMessage, Company } from "@prisma/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FormError } from "@/components/ui/form-error";

type MessageWithCompany = OutreachMessage & { company: Company };

export function CampaignSendPanel({
  campaignId,
  initialMessages,
  emailConfigured,
}: {
  campaignId: string;
  initialMessages: MessageWithCompany[];
  emailConfigured: boolean;
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [error, setError] = useState<string | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [isSendingAll, setIsSendingAll] = useState(false);
  const [lastSummary, setLastSummary] = useState<{
    sent: number;
    failed: number;
    skippedNoEmail: number;
  } | null>(null);

  const sendableCount = messages.filter(
    (m) => m.sendStatus !== "SENT" && m.company.contactEmail,
  ).length;
  const missingEmailCount = messages.filter((m) => !m.company.contactEmail).length;

  async function sendOne(messageId: string) {
    setError(null);
    setSendingId(messageId);
    try {
      const res = await fetch(`/api/outreach/${messageId}/send`, { method: "POST" });
      const body = await res.json();
      if (body.message) {
        setMessages((prev) =>
          prev.map((m) => (m.id === messageId ? { ...m, ...body.message } : m)),
        );
      }
      if (!res.ok) throw new Error(body.error ?? "Something went wrong.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSendingId(null);
    }
  }

  async function sendAll() {
    setError(null);
    setIsSendingAll(true);
    setLastSummary(null);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/send`, { method: "POST" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Something went wrong.");
      setLastSummary(body);
      if (Array.isArray(body.messages)) setMessages(body.messages);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsSendingAll(false);
    }
  }

  return (
    <Card>
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-medium text-[var(--color-text-primary)]">
          Outreach ({messages.length})
        </h2>
        <Button
          size="sm"
          onClick={sendAll}
          disabled={isSendingAll || !emailConfigured || sendableCount === 0}
        >
          {isSendingAll ? "Sending…" : `Send All (${sendableCount})`}
        </Button>
      </div>

      {!emailConfigured && (
        <p className="mt-2 text-xs text-[var(--color-warning)]">
          Email sending isn&apos;t configured for this workspace yet — messages can be reviewed
          and copied manually until it is.
        </p>
      )}
      {emailConfigured && missingEmailCount > 0 && (
        <p className="mt-2 text-xs text-[var(--color-text-muted)]">
          {missingEmailCount} prospect{missingEmailCount === 1 ? " has" : "s have"} no contact
          email yet — add one on their prospect page to include them in sending.
        </p>
      )}
      {lastSummary && (
        <p className="mt-2 text-xs text-[var(--color-text-secondary)]">
          Sent {lastSummary.sent}, failed {lastSummary.failed}, skipped {lastSummary.skippedNoEmail}{" "}
          (no email on file).
        </p>
      )}

      <div className="mt-4">
        <FormError message={error} />
      </div>

      <div className="mt-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4"
          >
            <div className="flex items-center justify-between gap-3">
              <Link
                href={`/prospects/${message.companyId}`}
                className="text-sm font-medium text-[var(--color-accent)] hover:underline"
              >
                {message.company.name}
              </Link>
              <SendStatusBadge
                status={message.sendStatus}
                sentAt={message.sentAt}
                hasEmail={Boolean(message.company.contactEmail)}
              />
            </div>
            <p className="mt-2 text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
              Subject
            </p>
            <p className="text-sm font-medium text-[var(--color-text-primary)]">
              {message.subject}
            </p>
            <p className="mt-2 whitespace-pre-wrap text-sm text-[var(--color-text-secondary)]">
              {message.body}
            </p>
            <div className="mt-3">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => sendOne(message.id)}
                disabled={
                  sendingId === message.id ||
                  message.sendStatus === "SENT" ||
                  !message.company.contactEmail ||
                  !emailConfigured
                }
              >
                {sendingId === message.id
                  ? "Sending…"
                  : message.sendStatus === "SENT"
                    ? "Sent"
                    : message.sendStatus === "FAILED"
                      ? "Retry Send"
                      : "Send"}
              </Button>
            </div>
          </div>
        ))}
        {messages.length === 0 && (
          <p className="text-sm text-[var(--color-text-muted)]">
            No outreach was generated for this campaign.
          </p>
        )}
      </div>
    </Card>
  );
}

function SendStatusBadge({
  status,
  sentAt,
  hasEmail,
}: {
  status: string;
  sentAt: Date | string | null;
  hasEmail: boolean;
}) {
  if (status === "SENT") {
    return (
      <Badge tone="high">Sent{sentAt ? ` ${new Date(sentAt).toLocaleDateString()}` : ""}</Badge>
    );
  }
  if (status === "FAILED") {
    return <Badge tone="low">Failed to send</Badge>;
  }
  if (!hasEmail) {
    return <Badge tone="medium">No contact email</Badge>;
  }
  return null;
}
