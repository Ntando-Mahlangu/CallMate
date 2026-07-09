import { Badge } from "@/components/ui/badge";

function toneForScore(score: number): "high" | "medium" | "low" {
  if (score >= 70) return "high";
  if (score >= 40) return "medium";
  return "low";
}

export function ScoreBadge({ label, score }: { label: string; score: number }) {
  return (
    <Badge tone={toneForScore(score)}>
      {label}: {score}
    </Badge>
  );
}
