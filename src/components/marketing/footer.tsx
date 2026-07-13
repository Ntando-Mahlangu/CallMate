import Link from "next/link";

export function MarketingFooter() {
  return (
    <footer className="border-t border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-10 text-sm text-[var(--color-text-muted)] sm:flex-row sm:items-center sm:justify-between">
        <span>Outrun</span>
        <nav className="flex gap-6">
          <Link href="/privacy" className="hover:text-[var(--color-text-secondary)]">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-[var(--color-text-secondary)]">
            Terms
          </Link>
          <Link href="/security" className="hover:text-[var(--color-text-secondary)]">
            Security
          </Link>
        </nav>
      </div>
    </footer>
  );
}
