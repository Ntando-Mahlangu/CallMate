import { Reveal, RevealGroup, RevealItem } from "@/components/motion/reveal";

const STEPS = [
  {
    step: "1",
    title: "Tell Outrun about your business.",
    body: "A short conversation — one question at a time, never a giant form.",
  },
  {
    step: "2",
    title: "Outrun analyses your business.",
    body: "It builds a Growth Score, finds your biggest opportunity, and identifies what's holding you back.",
  },
  {
    step: "3",
    title: "Receive your Growth Blueprint.",
    body: "Strengths, weaknesses, a ranked opportunity list, and a Today/Week/Month/Quarter roadmap.",
  },
  {
    step: "4",
    title: "Find and research your first prospects.",
    body: "Search in plain English, get scored results, and generate outreach — all before you've written a single email.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="mx-auto max-w-5xl px-6 py-20">
      <Reveal>
        <h2 className="text-center text-3xl font-light tracking-tight text-[var(--color-text-primary)]">
          From Sign Up to Your First Move in Five Minutes.
        </h2>
      </Reveal>
      <RevealGroup className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4" stagger={0.12}>
        {STEPS.map((s) => (
          <RevealItem key={s.step}>
            <div className="mb-3 text-2xl font-light text-gradient-signature">{s.step}</div>
            <h3 className="text-base font-medium text-[var(--color-text-primary)]">{s.title}</h3>
            <p className="mt-2 text-sm text-[var(--color-text-secondary)]">{s.body}</p>
          </RevealItem>
        ))}
      </RevealGroup>
    </section>
  );
}
