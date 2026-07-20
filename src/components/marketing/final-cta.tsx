import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/cn";

export function FinalCta() {
  return (
    <section className="border-t border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
      <div className="mx-auto max-w-3xl px-6 py-24 text-center">
        <h2 className="text-3xl font-light tracking-tight text-[var(--color-text-primary)] sm:text-4xl">
          Ready to Stop Guessing?
        </h2>
        <p className="mt-4 text-[var(--color-text-secondary)]">
          Let Outrun build your first Growth Blueprint today.
        </p>
        <div className="mt-8">
          <Link href="/sign-up" className={cn(buttonVariants({ size: "lg" }))}>
            Start Free
          </Link>
        </div>
      </div>
    </section>
  );
}
