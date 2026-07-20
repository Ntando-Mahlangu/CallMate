import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { Reveal } from "@/components/motion/reveal";

export function FinalCta() {
  return (
    <section className="relative overflow-hidden border-t border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-[30rem] w-[30rem] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-20 blur-3xl"
        style={{
          background: "radial-gradient(circle, var(--color-accent) 0%, transparent 70%)",
        }}
      />
      <div className="relative mx-auto max-w-3xl px-6 py-24 text-center">
        <Reveal>
          <h2 className="text-3xl font-light tracking-tight text-[var(--color-text-primary)] sm:text-4xl">
            Ready to Stop Guessing?
          </h2>
          <p className="mt-4 text-[var(--color-text-secondary)]">
            Let Outrun build your first Growth Blueprint today.
          </p>
          <div className="mt-8">
            <Link
              href="/sign-up"
              className={cn(
                buttonVariants({ size: "lg" }),
                "shadow-[var(--shadow-glow)] transition-shadow duration-300 hover:shadow-[var(--shadow-glow-lg)]",
              )}
            >
              Start Free
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
