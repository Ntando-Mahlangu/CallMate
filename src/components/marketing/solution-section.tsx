import { Card } from "@/components/ui/card";

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
      <h2 className="text-center text-3xl font-light tracking-tight text-[var(--color-text-primary)]">
        Meet Your AI Growth Partner
      </h2>
      <p className="mx-auto mt-4 max-w-xl text-center text-[var(--color-text-secondary)]">
        Instead of another dashboard, you get a partner that does the work with
        you — not just software that reports what already happened.
      </p>
      <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {CAPABILITIES.map((capability, i) => (
          <Card
            key={capability}
            className="animate-fade-in p-5 text-center"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <p className="text-sm text-[var(--color-text-primary)]">{capability}</p>
          </Card>
        ))}
      </div>
    </section>
  );
}
