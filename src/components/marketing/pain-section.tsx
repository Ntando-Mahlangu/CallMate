import { Card } from "@/components/ui/card";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/reveal";
import { FloatingGeometry } from "@/components/motion/floating-geometry";

const PAINS = [
  "Finding leads takes too long.",
  "You don't know where to focus.",
  "Marketing feels random.",
  "Your spreadsheets tell you what happened — not what to do next.",
];

export function PainSection() {
  return (
    <section className="mx-auto max-w-5xl px-6 py-20">
      <div className="relative">
        <div className="absolute left-0 top-1/2 hidden -translate-x-1/4 -translate-y-1/2 lg:block">
          <FloatingGeometry size={130} duration={17} />
        </div>
        <Reveal>
          <h2 className="text-center text-3xl font-light tracking-tight text-[var(--color-text-primary)]">
            Growing a business shouldn&apos;t feel like guesswork.
          </h2>
        </Reveal>
      </div>
      <RevealGroup className="mt-12 grid gap-4 sm:grid-cols-2" stagger={0.1}>
        {PAINS.map((pain) => (
          <RevealItem key={pain}>
            <Card className="text-[var(--color-text-secondary)]">{pain}</Card>
          </RevealItem>
        ))}
      </RevealGroup>
      <Reveal delay={0.15}>
        <p className="mt-8 text-center text-lg text-[var(--color-text-primary)]">
          Outrun changes that.
        </p>
      </Reveal>
    </section>
  );
}
