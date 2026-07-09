import { cn } from "@/lib/cn";

export function SelectablePill({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "rounded-[var(--radius-md)] border px-4 py-2 text-sm transition-colors duration-100",
        selected
          ? "border-[var(--color-accent)] bg-[var(--color-accent)]/15 text-[var(--color-text-primary)]"
          : "border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] hover:border-[var(--color-text-muted)]",
      )}
    >
      {label}
    </button>
  );
}
