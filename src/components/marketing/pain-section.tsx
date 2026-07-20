import { Card } from "@/components/ui/card";

const PAINS = [
  "Finding leads takes too long.",
  "You don't know where to focus.",
  "Marketing feels random.",
  "Your spreadsheets tell you what happened — not what to do next.",
];

export function PainSection() {
  return (
    <section className="mx-auto max-w-5xl px-6 py-20">
      <h2 className="text-center text-3xl font-light tracking-tight text-[var(--color-text-primary)]">
        Growing a business shouldn&apos;t feel like guesswork.
      </h2>
      <div className="mt-12 grid gap-4 sm:grid-cols-2">
        {PAINS.map((pain) => (
          <Card key={pain} className="text-[var(--color-text-secondary)]">
            {pain}
          </Card>
        ))}
      </div>
      <p className="mt-8 text-center text-lg text-[var(--color-text-primary)]">
        Outrun changes that.
      </p>
    </section>
  );
}
