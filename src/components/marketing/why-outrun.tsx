import { Card } from "@/components/ui/card";

const OUTRUN_POINTS = [
  "Understands your business",
  "Builds strategy",
  "Finds prospects",
  "Explains recommendations",
  "Learns over time",
  "Gives daily priorities",
  "Acts like a Growth Partner",
];

const OTHER_TOOLS = [
  "Lead database",
  "CRM",
  "Email software",
  "Reporting dashboard",
  "Disconnected tools that don't talk to each other",
];

export function WhyOutrun() {
  return (
    <section className="mx-auto max-w-4xl px-6 py-20">
      <h2 className="text-center text-3xl font-light tracking-tight text-[var(--color-text-primary)]">
        Why Outrun
      </h2>
      <div className="mt-12 grid gap-6 sm:grid-cols-2">
        <Card className="border-[var(--color-accent)]/40">
          <h3 className="text-lg font-medium text-[var(--color-text-primary)]">Outrun</h3>
          <ul className="mt-4 space-y-3 text-sm text-[var(--color-text-secondary)]">
            {OUTRUN_POINTS.map((point) => (
              <li key={point} className="flex items-start gap-2">
                <span className="text-[var(--color-success)]">✔</span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <h3 className="text-lg font-medium text-[var(--color-text-primary)]">
            Everything else
          </h3>
          <ul className="mt-4 space-y-3 text-sm text-[var(--color-text-secondary)]">
            {OTHER_TOOLS.map((tool) => (
              <li key={tool} className="flex items-start gap-2">
                <span className="text-[var(--color-text-muted)]">–</span>
                <span>{tool}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </section>
  );
}
