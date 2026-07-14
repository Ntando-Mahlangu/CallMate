import { Badge } from "@/components/ui/badge";

function toneForScore(score: number): "high" | "medium" | "low" {
  if (score >= 70) return "high";
  if (score >= 40) return "medium";
  return "low";
}

export function ScoreBadge({
  label,
  score,
  reason,
}: {
  label: string;
  score: number;
  reason?: string | null;
}) {
  return (
    <Badge
      tone={toneForScore(score)}
      title={reason ?? undefined}
      className={reason ? "cursor-help underline decoration-dotted" : undefined}
    >
      {label}: {score}
    </Badge>
  );
}
