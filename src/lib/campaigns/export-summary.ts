import type { Campaign, OutreachMessage, Company } from "@prisma/client";

type MessageWithCompany = OutreachMessage & { company: Company };

function variantStats(messages: MessageWithCompany[], label: "A" | "B") {
  const variantMessages = messages.filter((m) => m.variantLabel === label);
  const sent = variantMessages.filter((m) => m.sendStatus === "SENT");
  const replies = sent.filter((m) => m.gotReply).length;
  return { label, total: variantMessages.length, sent: sent.length, replies };
}

// docs/outrun/07 "EXPORTS" — Campaign summaries. Every number here is
// pulled directly from the database (send status, manually-reported
// replies); nothing here is AI-inferred, so there's nothing to caveat.
export function campaignToSummaryMarkdown(
  organizationName: string,
  campaign: Campaign,
  messages: MessageWithCompany[],
): string {
  const sent = messages.filter((m) => m.sendStatus === "SENT");
  const failed = messages.filter((m) => m.sendStatus === "FAILED");
  const replies = sent.filter((m) => m.gotReply).length;
  const replyRate = sent.length > 0 ? Math.round((replies / sent.length) * 100) : null;
  const hasVariants = messages.some((m) => m.variantLabel);

  const lines: string[] = [];
  lines.push(`# ${campaign.name}`);
  lines.push("");
  lines.push(`Campaign summary for ${organizationName}, exported ${new Date().toLocaleDateString()}.`);
  lines.push("");
  lines.push(`**Objective:** ${campaign.objective}`);
  lines.push(`**Status:** ${campaign.status}`);
  lines.push("");

  if (campaign.strategyRationale) {
    lines.push("## AI Campaign Strategy");
    if (campaign.strategyConfidence) {
      lines.push(`**Confidence:** ${campaign.strategyConfidence}`);
    }
    lines.push("");
    lines.push(campaign.strategyRationale);
    lines.push("");
  }

  lines.push("## Performance");
  lines.push("");
  lines.push(`- Messages generated: ${messages.length}`);
  lines.push(`- Sent: ${sent.length}`);
  lines.push(`- Failed to send: ${failed.length}`);
  lines.push(
    `- Reply rate: ${replyRate !== null ? `${replyRate}% (${replies} of ${sent.length} sent)` : "Not enough sent messages yet"}`,
  );
  lines.push("");
  lines.push(
    "_Replies are manually reported — Outrun has no inbox access, so this only reflects what you've marked._",
  );
  lines.push("");

  if (hasVariants) {
    lines.push("## A/B Variants");
    lines.push("");
    for (const label of ["A", "B"] as const) {
      const v = variantStats(messages, label);
      const rate = v.sent > 0 ? `${Math.round((v.replies / v.sent) * 100)}%` : "—";
      lines.push(`- Variant ${v.label}: ${v.total} generated, ${v.sent} sent, ${rate} reply rate`);
    }
    lines.push("");
  }

  lines.push("## Messages");
  lines.push("");
  for (const message of messages) {
    lines.push(`### ${message.company.name}${message.variantLabel ? ` (Variant ${message.variantLabel})` : ""}`);
    lines.push(`**Status:** ${message.sendStatus}${message.gotReply ? " · Replied" : ""}`);
    lines.push("");
    lines.push(`**Subject:** ${message.subject}`);
    lines.push("");
    lines.push(message.body);
    lines.push("");
  }

  return lines.join("\n");
}
