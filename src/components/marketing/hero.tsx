import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/cn";

export function Hero() {
  return (
    <section className="mx-auto max-w-4xl px-6 pb-24 pt-24 text-center sm:pt-32">
      <h1 className="text-4xl font-light tracking-tight text-[var(--color-text-primary)] sm:text-6xl">
        Stop Guessing.
        <br />
        Start Growing.
      </h1>
      <p className="mx-auto mt-6 max-w-2xl text-lg text-[var(--color-text-secondary)]">
        Outrun understands your business, finds your best opportunities, builds
        your growth strategy, and researches your prospects before you even
        start working.
      </p>
      <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
        <Link href="/sign-up" className={cn(buttonVariants({ size: "lg" }))}>
          Start Free
        </Link>
        <a
          href="#how-it-works"
          className={cn(buttonVariants({ variant: "secondary", size: "lg" }))}
        >
          See How It Works
        </a>
      </div>
    </section>
  );
}
