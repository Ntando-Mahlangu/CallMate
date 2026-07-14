import type { Campaign, Company } from "@prisma/client";
import type { CallScriptData } from "@/lib/prospects/call-script-schema";

// docs/outrun/07 "EXPORTS" — Call scripts, compiled across every company
// in a campaign that already has one generated (docs/outrun/07 "COLD CALL
// SCRIPT"). Companies without a cached script are listed separately
// rather than silently skipped, so the export never looks more complete
// than it is.
export function campaignToCallScriptsMarkdown(
  organizationName: string,
  campaign: Campaign,
  companies: Company[],
): string {
  const withScript = companies.filter((c) => c.callScript);
  const withoutScript = companies.filter((c) => !c.callScript);

  const lines: string[] = [];
  lines.push(`# ${campaign.name} — Call Scripts`);
  lines.push("");
  lines.push(`Call scripts for ${organizationName}, exported ${new Date().toLocaleDateString()}.`);
  lines.push("");

  for (const company of withScript) {
    const script = company.callScript as CallScriptData;
    lines.push(`## ${company.name}`);
    lines.push("");
    lines.push("**Opening**");
    lines.push(script.opening);
    lines.push("");
    lines.push("**Discovery Questions**");
    for (const q of script.discoveryQuestions) lines.push(`- ${q}`);
    lines.push("");
    lines.push("**Pain Exploration**");
    lines.push(script.painExploration);
    lines.push("");
    lines.push("**Value Statement**");
    lines.push(script.valueStatement);
    lines.push("");
    lines.push("**Objection Handling**");
    for (const o of script.objectionHandling) {
      lines.push(`- "${o.objection}" — ${o.response}`);
    }
    lines.push("");
    lines.push("**Closing**");
    lines.push(script.closing);
    lines.push("");
    lines.push("---");
    lines.push("");
  }

  if (withoutScript.length > 0) {
    lines.push("## No call script yet");
    lines.push("");
    lines.push(
      "These companies are part of this campaign but don't have a call script generated yet:",
    );
    for (const company of withoutScript) lines.push(`- ${company.name}`);
    lines.push("");
  }

  return lines.join("\n");
}
