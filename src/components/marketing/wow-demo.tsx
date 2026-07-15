"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/cn";

// docs/outrun/02 "WOW SECTION" — a fixed, clearly-labeled example scenario
// (the same input/output the spec itself specifies), not a live AI call:
// that keeps this section deterministic and free of API cost or prompt
// injection risk on a public marketing page, while the Constitution's
// anti-fabrication rule is upheld through the explicit "estimate based on
// assumptions" caveat and the "example" labeling below.
const PROMPT = "We help accounting firms automate client onboarding.";
const TYPE_MS = 35;
const THINK_MS = 1400;

export function WowDemo() {
  const [typed, setTyped] = useState("");
  const [phase, setPhase] = useState<"typing" | "thinking" | "result">("typing");

  useEffect(() => {
    if (phase !== "typing") return;
    if (typed.length >= PROMPT.length) {
      const t = setTimeout(() => setPhase("thinking"), 400);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setTyped(PROMPT.slice(0, typed.length + 1)), TYPE_MS);
    return () => clearTimeout(t);
  }, [typed, phase]);

  useEffect(() => {
    if (phase !== "thinking") return;
    const t = setTimeout(() => setPhase("result"), THINK_MS);
    return () => clearTimeout(t);
  }, [phase]);

  function replay() {
    setTyped("");
    setPhase("typing");
  }

  return (
    <section id="wow-demo" className="mx-auto max-w-3xl px-6 py-20">
      <p className="text-center text-xs uppercase tracking-wide text-[var(--color-accent)]">
        Example
      </p>
      <h2 className="mt-2 text-center text-3xl font-light tracking-tight text-[var(--color-text-primary)]">
        Watch Outrun think.
      </h2>
      <p className="mx-auto mt-4 max-w-lg text-center text-[var(--color-text-secondary)]">
        A real business owner describes what they do. Here&apos;s the kind of
        Growth Blueprint Outrun prepares in return.
      </p>

      <Card className="mt-10">
        <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-4 py-3 font-mono text-sm text-[var(--color-text-primary)]">
          {typed}
          {phase === "typing" && <span className="animate-pulse">|</span>}
        </div>

        {phase === "thinking" && (
          <p className="mt-6 text-center text-sm text-[var(--color-text-muted)]">
            Outrun is thinking…
          </p>
        )}

        {phase === "result" && (
          <div className="mt-6 animate-fade-in space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
                  Growth Score
                </p>
                <p className="text-2xl font-light text-[var(--color-text-primary)]">74</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
                  Best Customer
                </p>
                <p className="text-lg text-[var(--color-text-primary)]">Accounting firms</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
                  Biggest Opportunity
                </p>
                <p className="text-lg text-[var(--color-text-primary)]">Cold outbound</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
                  Estimated Opportunity
                </p>
                <p className="text-lg text-[var(--color-text-primary)]">
                  $240k ARR
                  <span className="ml-1 text-xs text-[var(--color-text-muted)]">
                    (estimate based on assumptions)
                  </span>
                </p>
              </div>
            </div>

            <div className="border-t border-[var(--color-border)] pt-5">
              <p className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
                Top Strategy
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {["Email", "LinkedIn", "Referrals"].map((channel) => (
                  <span
                    key={channel}
                    className="rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-1 text-xs text-[var(--color-text-secondary)]"
                  >
                    {channel}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-[var(--color-border)] pt-5 text-sm">
              <span className="text-[var(--color-text-secondary)]">
                148 companies found · 129 verified emails
              </span>
              <span
                className={cn(
                  "rounded-[var(--radius-md)] bg-[var(--color-accent)] px-4 py-1.5 text-xs font-medium text-white",
                  "shadow-[0_0_20px_var(--color-accent)]",
                )}
              >
                Launch Ready
              </span>
            </div>

            <button
              type="button"
              onClick={replay}
              className="mx-auto block text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
            >
              Replay
            </button>
          </div>
        )}
      </Card>
    </section>
  );
}
