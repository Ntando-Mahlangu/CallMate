"use client";

import { motion, useReducedMotion } from "framer-motion";

// docs/outrun/01 — the "futuristic, luxury" signature background: two
// large, softly blurred gradient blobs drifting very slowly behind hero
// content. Purely decorative (aria-hidden) and never blocks interaction
// (pointer-events-none). Freezes in place under prefers-reduced-motion
// rather than disabling entirely — the glow itself is part of the design,
// only the motion is what needs to go.
export function AuroraBackground() {
  const reduceMotion = useReducedMotion();

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <motion.div
        className="absolute -left-1/4 top-[-10%] h-[40rem] w-[40rem] rounded-full opacity-30 blur-3xl"
        style={{
          background:
            "radial-gradient(circle, var(--color-accent) 0%, transparent 70%)",
        }}
        animate={
          reduceMotion
            ? undefined
            : { x: [0, 40, -20, 0], y: [0, 30, -10, 0], scale: [1, 1.08, 0.96, 1] }
        }
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -right-1/4 top-[10%] h-[36rem] w-[36rem] rounded-full opacity-25 blur-3xl"
        style={{
          background:
            "radial-gradient(circle, var(--color-accent-2) 0%, transparent 70%)",
        }}
        animate={
          reduceMotion
            ? undefined
            : { x: [0, -30, 20, 0], y: [0, -20, 15, 0], scale: [1, 0.95, 1.05, 1] }
        }
        transition={{ duration: 26, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}
