import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium",
  {
    variants: {
      tone: {
        high: "bg-[var(--color-success)]/15 text-[var(--color-success)]",
        medium: "bg-[var(--color-warning)]/15 text-[var(--color-warning)]",
        low: "bg-[var(--color-text-muted)]/15 text-[var(--color-text-muted)]",
        accent: "bg-[var(--color-accent)]/15 text-[var(--color-accent-text)]",
      },
    },
    defaultVariants: { tone: "medium" },
  },
);

export type ImpactLevel = "Low" | "Medium" | "High";

const IMPACT_TONE: Record<ImpactLevel, VariantProps<typeof badgeVariants>["tone"]> = {
  High: "high",
  Medium: "medium",
  Low: "low",
};

export function Badge({
  className,
  tone,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}

export function ImpactBadge({ level, label }: { level: ImpactLevel; label?: string }) {
  return <Badge tone={IMPACT_TONE[level]}>{label ?? `${level} impact`}</Badge>;
}
