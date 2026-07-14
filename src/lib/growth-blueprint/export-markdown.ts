import type { GrowthBlueprint } from "@prisma/client";
import type { GrowthBlueprintData } from "./schema";

/** docs/outrun/05 "EXPORTS" — Markdown. Mirrors src/components/growth-blueprint/blueprint-view.tsx section by section. */
export function blueprintToMarkdown(organizationName: string, blueprint: GrowthBlueprint): string {
  const strengths = blueprint.strengths as GrowthBlueprintData["strengths"];
  const weaknesses = blueprint.weaknesses as GrowthBlueprintData["weaknesses"];
  const bottleneck = blueprint.biggestBottleneck as GrowthBlueprintData["biggestBottleneck"];
  const opportunities = blueprint.opportunities as GrowthBlueprintData["opportunities"];
  const growthStrategy = blueprint.growthStrategy as GrowthBlueprintData["growthStrategy"];
  const icp = blueprint.idealCustomerProfile as GrowthBlueprintData["idealCustomerProfile"];
  const roadmap = blueprint.roadmap as GrowthBlueprintData["roadmap"];
  const scoreCategories = blueprint.scoreCategories as GrowthBlueprintData["scoreCategories"];

  const lines: string[] = [];
  const h = (text: string) => lines.push(`## ${text}`, "");

  lines.push(`# ${organizationName} — Growth Blueprint`, `_Version ${blueprint.version}_`, "");

  h("Growth Score");
  lines.push(`**${blueprint.growthScore}/100**`, "", blueprint.executiveSummary, "");

  h("Strengths");
  strengths.forEach((s) => lines.push(`- **${s.title}** — ${s.reason}`));
  lines.push("");

  h("Weaknesses");
  weaknesses.forEach((w) =>
    lines.push(
      `- **${w.title}** (${w.estimatedImpact} impact) — ${w.whyItMatters} Fix: ${w.suggestedImprovement}`,
    ),
  );
  lines.push("");

  h("Biggest Opportunity");
  lines.push(
    `**${bottleneck.title}**`,
    "",
    bottleneck.description,
    "",
    `Why it matters: ${bottleneck.whyItIsLimitingGrowth}`,
    "",
    `Fixing it changes the business by: ${bottleneck.howFixingItChangesTheBusiness}`,
    "",
  );

  h("Highest ROI Opportunities");
  opportunities.forEach((o) =>
    lines.push(
      `### ${o.title} (${o.confidence}% confidence, ${o.estimatedImpact} impact)`,
      o.description,
      "",
      `Evidence: ${o.supportingEvidence}`,
      "",
      `Next step: ${o.recommendedAction}`,
      "",
    ),
  );

  h("Recommended Growth Strategy");
  growthStrategy.forEach((s) => lines.push(`- **${s.channel}** (${s.impact} impact) — ${s.whyItFits}`));
  lines.push("");

  h("Ideal Customer Profile");
  lines.push(
    `- Industry: ${icp.industry}`,
    `- Company size: ${icp.companySize}`,
    `- Decision maker: ${icp.decisionMaker}`,
    `- Location: ${icp.location}`,
    `- Pain points: ${icp.painPoints.join(", ")}`,
    `- Likely goals: ${icp.likelyGoals.join(", ")}`,
    `- Buying triggers: ${icp.buyingTriggers.join(", ")}`,
    "",
  );

  h("Growth Roadmap");
  (["Today", "This Week", "This Month", "This Quarter"] as const).forEach((horizon) => {
    const items = roadmap.filter((item) => item.horizon === horizon);
    if (items.length === 0) return;
    lines.push(`### ${horizon}`);
    items.forEach((item) => lines.push(`- ${item.action} — ${item.reason}`));
    lines.push("");
  });

  h("Score Breakdown");
  scoreCategories.forEach((c) => lines.push(`- **${c.category}**: ${c.score}/100 — ${c.reason}`));
  lines.push("");

  h("AI Confidence Notes");
  lines.push(blueprint.confidenceNotes, "");

  return lines.join("\n");
}
