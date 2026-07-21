"use client";

import { motion, useReducedMotion } from "framer-motion";

// docs/outrun/01 — the site's signature decorative animation (in the
// spirit of Resend's slowly-tumbling 3D object): a small faceted,
// translucent shape built from stacked hexagonal panels — echoing the
// Outrun logo's hexagon rather than a literal cube — continuously
// rotating in 3D space with a soft ambient glow behind it. Purely
// decorative (aria-hidden); freezes to a static angled pose rather than
// spinning under prefers-reduced-motion.
const HEX_CLIP = "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)";

const FACETS = [
  { z: 28, rotateX: 0, rotateY: 0, from: "var(--color-accent)", to: "var(--color-accent-2)", opacity: 0.55 },
  { z: 0, rotateX: 35, rotateY: 20, from: "var(--color-accent-2)", to: "var(--color-accent)", opacity: 0.4 },
  { z: -28, rotateX: -25, rotateY: -30, from: "var(--color-accent)", to: "var(--color-accent-2)", opacity: 0.3 },
];

export function FloatingGeometry({
  size = 140,
  duration = 16,
  className = "",
}: {
  size?: number;
  duration?: number;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <div
      aria-hidden
      className={`pointer-events-none relative ${className}`}
      style={{ width: size, height: size, perspective: 900 }}
    >
      <div
        className="absolute inset-0 rounded-full opacity-40 blur-2xl"
        style={{ background: "radial-gradient(circle, var(--color-accent) 0%, transparent 70%)" }}
      />
      <motion.div
        className="absolute inset-0"
        style={{ transformStyle: "preserve-3d" }}
        animate={
          reduceMotion
            ? undefined
            : { rotateX: [15, 375], rotateY: [0, 360] }
        }
        initial={reduceMotion ? { rotateX: 15, rotateY: 25 } : undefined}
        transition={{ duration, repeat: Infinity, ease: "linear" }}
      >
        {FACETS.map((facet, i) => (
          <div
            key={i}
            className="absolute inset-[12%] rounded-[10%] border border-white/10 backdrop-blur-sm"
            style={{
              clipPath: HEX_CLIP,
              background: `linear-gradient(135deg, ${facet.from}, ${facet.to})`,
              opacity: facet.opacity,
              transform: `translateZ(${facet.z}px) rotateX(${facet.rotateX}deg) rotateY(${facet.rotateY}deg)`,
            }}
          />
        ))}
      </motion.div>
    </div>
  );
}
