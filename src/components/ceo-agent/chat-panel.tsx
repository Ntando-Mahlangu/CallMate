"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import { cn } from "@/lib/cn";

type Message = { role: "USER" | "ASSISTANT"; content: string };

export function ChatPanel({ initialMessages }: { initialMessages: Message[] }) {
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const question = input.trim();
    if (!question) return;

    setError(null);
    setMessages((prev) => [...prev, { role: "USER", content: question }]);
    setInput("");
    setIsSending(true);

    try {
      const res = await fetch("/api/ceo-agent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: question }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Something went wrong.");
      setMessages((prev) => [...prev, { role: "ASSISTANT", content: body.reply }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <Card className="flex h-[32rem] flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto pr-1">
        {messages.length === 0 && (
          <p className="text-sm text-[var(--color-text-muted)]">
            Ask anything — &quot;How should I grow next month?&quot;,
            &quot;Why should I focus on this opportunity?&quot;,
            &quot;What&apos;s my biggest weakness?&quot;
          </p>
        )}
        {messages.map((message, i) => (
          <div
            key={i}
            className={cn("max-w-[85%] rounded-[var(--radius-md)] px-4 py-3 text-sm", {
              "ml-auto bg-[var(--color-accent)]/15 text-[var(--color-text-primary)]":
                message.role === "USER",
              "bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)]":
                message.role === "ASSISTANT",
            })}
          >
            <p className="whitespace-pre-wrap">{message.content}</p>
          </div>
        ))}
        {isSending && (
          <div className="max-w-[85%] rounded-[var(--radius-md)] bg-[var(--color-bg-secondary)] px-4 py-3 text-sm text-[var(--color-text-muted)]">
            Thinking…
          </div>
        )}
      </div>

      <FormError message={error} />

      <form onSubmit={handleSubmit} className="mt-4 flex gap-3">
        <Input
          aria-label="Message to the CEO Agent"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask the CEO Agent…"
          disabled={isSending}
        />
        <Button type="submit" disabled={isSending || !input.trim()}>
          Send
        </Button>
      </form>
    </Card>
  );
}
