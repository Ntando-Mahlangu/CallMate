import { Reveal } from "@/components/motion/reveal";
import { FloatingGeometry } from "@/components/motion/floating-geometry";

export function ProductPhilosophy() {
  return (
    <section className="mx-auto max-w-4xl px-6 py-20">
      <div className="flex flex-col items-center gap-8 sm:flex-row sm:justify-center sm:gap-12">
        <Reveal className="text-center sm:text-left">
          <h2 className="text-3xl font-light tracking-tight text-[var(--color-text-primary)]">
            Software should think.
            <br />
            Not make you think.
          </h2>
          <p className="mx-auto mt-4 max-w-md text-[var(--color-text-secondary)] sm:mx-0">
            Outrun removes busy work so business owners can focus on making
            decisions.
          </p>
        </Reveal>
        <Reveal delay={0.15} className="shrink-0">
          <FloatingGeometry size={130} duration={18} />
        </Reveal>
      </div>
    </section>
  );
}
