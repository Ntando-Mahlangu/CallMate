import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { HeroDemo } from "@/components/marketing/hero-demo";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "linear-gradient(var(--color-border) 1px, transparent 1px), linear-gradient(90deg, var(--color-border) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage: "radial-gradient(ellipse 80% 60% at 50% 0%, black, transparent)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 h-[36rem] w-[36rem] -translate-x-1/2 rounded-full bg-[var(--color-accent)]/10 blur-3xl"
      />

      <div className="relative mx-auto grid max-w-6xl gap-16 px-6 pb-24 pt-24 sm:pt-32 lg:grid-cols-2 lg:items-center">
        <div className="text-center lg:text-left">
          <h1 className="text-4xl font-light tracking-tight text-[var(--color-text-primary)] sm:text-6xl">
            Stop Guessing.
            <br />
            Start Growing.
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-[var(--color-text-secondary)] lg:mx-0">
            Outrun understands your business, finds your best opportunities, builds
            your growth strategy, and prepares campaigns before you even start
            working.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4 lg:justify-start">
            <Link href="/sign-up" className={cn(buttonVariants({ size: "lg" }))}>
              Start Free
            </Link>
            <a
              href="#wow-demo"
              className={cn(buttonVariants({ variant: "secondary", size: "lg" }))}
            >
              Watch Demo
            </a>
          </div>
        </div>

        <HeroDemo />
      </div>
    </section>
  );
}
