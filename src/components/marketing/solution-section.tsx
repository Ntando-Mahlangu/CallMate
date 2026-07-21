import { Card } from "@/components/ui/card";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/reveal";
import { FloatingGeometry } from "@/components/motion/floating-geometry";

const CAPABILITIES = [
  "Learns your business.",
  "Builds a growth strategy.",
  "Finds opportunities.",
  "Researches prospects.",
  "Creates outreach.",
  "Prepares campaigns.",
  "Tracks progress.",
  "Recommends your next move.",
];

export function SolutionSection() {
  return (
    <section className="mx-auto max-w-5xl px-6 py-20">
      <div className="relative">
        <div className="absolute right-0 top-1/2 hidden -translate-y-1/2 translate-x-1/4 lg:block">
          <FloatingGeometry size={150} duration={20} />
        </div>
        <Reveal>
          <h2 className="text-center text-3xl font-light tracking-tight text-[var(--color-text-primary)]">
            Meet Your AI Growth Partner
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-center text-[var(--color-text-secondary)]">
            Instead of another dashboard, you get a partner that does the work with
            you — not just software that reports what already happened.
          </p>
        </Reveal>
      </div>
      <RevealGroup className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" stagger={0.06}>
        {CAPABILITIES.map((capability) => (
          <RevealItem key={capability}>
            <Card interactive className="p-5 text-center">
              <p className="text-sm text-[var(--color-text-primary)]">{capability}</p>
            </Card>
          </RevealItem>
        ))}
      </RevealGroup>
    </section>
  );
}
