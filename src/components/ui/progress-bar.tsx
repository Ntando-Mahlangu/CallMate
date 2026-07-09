export function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-bg-secondary)]">
      <div
        className="h-full rounded-full bg-[var(--color-accent)] transition-[width] duration-250"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}
