"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { FormError } from "@/components/ui/form-error";
import { Button } from "@/components/ui/button";

// docs/outrun/03 "AI ANALYSIS" — never a spinner, always a sense of progress.
const MESSAGES = [
  "Understanding your business…",
  "Analysing your market…",
  "Finding opportunities…",
  "Comparing growth strategies…",
  "Building your Growth Blueprint…",
  "Preparing recommendations…",
];

export default function GeneratingBlueprintPage() {
  const router = useRouter();
  const [messageIndex, setMessageIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((i) => Math.min(i + 1, MESSAGES.length - 1));
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/blueprint/generate", { method: "POST" })
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? "Something went wrong.");
        if (!cancelled) router.push("/blueprint");
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "We couldn't build your Growth Blueprint. Please try again.",
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--color-bg-primary)] px-4 py-16">
      <Card className="w-full max-w-md animate-fade-in text-center">
        {error ? (
          <div className="space-y-4">
            <FormError message={error} />
            <Button className="w-full" onClick={() => router.push("/onboarding")}>
              Back to Business Discovery
            </Button>
          </div>
        ) : (
          <>
            <div className="mx-auto mb-6 size-10 animate-pulse rounded-full bg-[var(--color-accent)]" />
            <p
              key={messageIndex}
              className="animate-fade-in text-lg font-light text-[var(--color-text-primary)]"
            >
              {MESSAGES[messageIndex]}
            </p>
            <p className="mt-3 text-sm text-[var(--color-text-muted)]">
              This usually takes 30–60 seconds.
            </p>
          </>
        )}
      </Card>
    </main>
  );
}
