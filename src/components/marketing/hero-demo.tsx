"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/cn";

// docs/outrun/02 "HERO VISUAL" — a realistic interactive dashboard
// animation, not a static screenshot. This is a stylized product demo
// (generic placeholder names, no real business data), so it never risks
// presenting an invented number as a real result — only the labeled Wow
// Demo section further down the page carries the anti-fabrication caveat
// text, because that one names a concrete estimate.
const STAGES = [
  { label: "Analyzing your business…" },
  { label: "Growth Score calculated" },
  { label: "Researching best-fit prospects…" },
  { label: "Growth Blueprint generated" },
  { label: "Prospects found" },
  { label: "Lead scores generated" },
  { label: "Campaign prepared" },
  { label: "Ready to launch" },
] as const;

const STAGE_MS = 1800;

export function HeroDemo() {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setStage((s) => (s + 1) % STAGES.length);
    }, STAGE_MS);
    return () => clearInterval(id);
  }, []);

  const showScore = stage >= 1;
  const showProspects = stage >= 4;
  const showCampaign = stage >= 6;
  const launchGlowing = stage === 7;

  return (
    <Card className="mx-auto w-full max-w-md animate-fade-in text-left">
      <p className="text-xs uppercase tracking-wide text-[var(--color-accent)]">
        {STAGES[stage]!.label}
      </p>

      <div className="mt-5 flex items-center gap-4">
        <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-[var(--color-border)]">
          <div
            className="absolute inset-0 rounded-full border-2 border-[var(--color-accent)] transition-all duration-700"
            style={{
              clipPath: showScore
                ? "polygon(50% 50%, 50% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%, 40% 0%)"
                : "polygon(50% 50%, 50% 0%, 50% 0%)",
            }}
          />
          <span className="text-sm font-light text-[var(--color-text-primary)]">
            {showScore ? "82" : "—"}
          </span>
        </div>
        <div>
          <p className="text-sm font-medium text-[var(--color-text-primary)]">Growth Score</p>
          <p className="text-xs text-[var(--color-text-muted)]">
            {showScore ? "Strong foundation, clear next move" : "Waiting for analysis…"}
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-2 border-t border-[var(--color-border)] pt-5">
        {["Acme Fittings Co.", "Northbridge Supply", "Harlow & Vance"].map((name, i) => (
          <div
            key={name}
            className={cn(
              "flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-2 text-xs transition-all duration-500",
              showProspects ? "opacity-100" : "translate-y-1 opacity-0",
            )}
            style={{ transitionDelay: `${i * 120}ms` }}
          >
            <span className="text-[var(--color-text-primary)]">{name}</span>
            <span className="text-[var(--color-success)]">{92 - i * 7}% fit</span>
          </div>
        ))}
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-[var(--color-border)] pt-5">
        <span className="text-xs text-[var(--color-text-muted)]">
          {showCampaign ? "Campaign prepared · 3 messages" : "Campaign not started"}
        </span>
        <span
          className={cn(
            "rounded-[var(--radius-md)] bg-[var(--color-accent)] px-4 py-1.5 text-xs font-medium text-white transition-all duration-500",
            launchGlowing ? "shadow-[0_0_20px_var(--color-accent)]" : "opacity-60",
          )}
        >
          Launch
        </span>
      </div>

      <p className="mt-4 text-center text-[10px] text-[var(--color-text-muted)]">
        Illustrative preview
      </p>
    </Card>
  );
}
