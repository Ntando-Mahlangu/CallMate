/**
 * docs/outrun/07 "SMART WARNINGS" — deterministic checks, not an AI
 * judgment call, so the same inputs always produce the same warning
 * (and a warning always comes with a concrete reason + suggestion,
 * never a vague "this might not work").
 */
export type SmartWarning = {
  id: string;
  title: string;
  detail: string;
  suggestion: string;
};

const SMALL_AUDIENCE_THRESHOLD = 3;
const BROAD_AUDIENCE_THRESHOLD = 150;
const LOW_AVG_FIT_THRESHOLD = 50;

/** Audience-level warnings, computable before any outreach is generated. */
export function getAudienceWarnings(input: {
  companyCount: number;
  averageFitScore: number;
  confidence: "Low" | "Medium" | "High";
}): SmartWarning[] {
  const warnings: SmartWarning[] = [];

  if (input.companyCount < SMALL_AUDIENCE_THRESHOLD) {
    warnings.push({
      id: "audience-too-small",
      title: "Audience too small",
      detail: `Only ${input.companyCount} compan${input.companyCount === 1 ? "y is" : "ies are"} selected.`,
      suggestion: "Add more prospects, or widen your Custom Filters, before launching.",
    });
  }

  if (input.companyCount > BROAD_AUDIENCE_THRESHOLD) {
    warnings.push({
      id: "audience-too-broad",
      title: "Audience too broad",
      detail: `${input.companyCount} companies selected — that's a lot of ground to personalize well.`,
      suggestion: "Narrow with Custom Filters or a Saved List so messaging can stay specific.",
    });
  }

  if (input.averageFitScore > 0 && input.averageFitScore < LOW_AVG_FIT_THRESHOLD) {
    warnings.push({
      id: "low-average-fit",
      title: "Mixed audience fit",
      detail: `Average Fit Score across this audience is ${Math.round(input.averageFitScore)}/100.`,
      suggestion: "Consider filtering to higher-fit prospects for a stronger response rate.",
    });
  }

  if (input.confidence === "Low") {
    warnings.push({
      id: "low-confidence",
      title: "Low strategy confidence",
      detail: "Outrun's AI has low confidence this audience matches your ideal customer profile.",
      suggestion: "Review the strategy rationale below, or adjust your audience, before generating messages.",
    });
  }

  return warnings;
}

const MAX_BODY_WORDS = 220;
const SPAM_KEYWORDS = [
  "act now",
  "click here",
  "risk-free",
  "risk free",
  "guarantee",
  "guaranteed",
  "no obligation",
  "limited time",
  "100% free",
  "buy now",
  "don't miss out",
  "urgent",
  "congratulations",
];
const CTA_VERBS = [
  "call",
  "chat",
  "book",
  "schedule",
  "reply",
  "let me know",
  "worth a conversation",
  "open to",
  "up for",
  "grab",
];

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function firstWords(text: string, count: number): string {
  return text.trim().toLowerCase().split(/\s+/).slice(0, count).join(" ");
}

/**
 * Content-level warnings, computed from already-generated messages — a
 * campaign can have zero, some, or many of these; each names the
 * specific message(s) affected rather than a generic "something's off".
 */
export function getContentWarnings(
  messages: { id: string; subject: string; body: string }[],
): SmartWarning[] {
  const warnings: SmartWarning[] = [];
  if (messages.length === 0) return warnings;

  const tooLong = messages.filter((m) => wordCount(m.body) > MAX_BODY_WORDS);
  if (tooLong.length > 0) {
    warnings.push({
      id: "message-too-long",
      title: "Message too long",
      detail: `${tooLong.length} message${tooLong.length === 1 ? "" : "s"} run over the recommended 150-200 words.`,
      suggestion: "Trim to one clear idea and a single call to action.",
    });
  }

  const weakCta = messages.filter((m) => {
    const lower = m.body.toLowerCase();
    return !CTA_VERBS.some((verb) => lower.includes(verb)) && !m.body.trim().endsWith("?");
  });
  if (weakCta.length > 0) {
    warnings.push({
      id: "weak-cta",
      title: "Weak call to action",
      detail: `${weakCta.length} message${weakCta.length === 1 ? "" : "s"} don't end with a clear, low-friction ask.`,
      suggestion: 'Close with something concrete, like "Worth a 15-minute call this week?"',
    });
  }

  const spamHits = messages.filter((m) => {
    const lower = `${m.subject} ${m.body}`.toLowerCase();
    return SPAM_KEYWORDS.some((word) => lower.includes(word));
  });
  if (spamHits.length > 0) {
    warnings.push({
      id: "spam-risk",
      title: "Potential spam risk",
      detail: `${spamHits.length} message${spamHits.length === 1 ? "" : "s"} contain wording that spam filters commonly flag.`,
      suggestion: "Replace phrases like \"act now\" or \"guaranteed\" with plain, specific language.",
    });
  }

  if (messages.length > 1) {
    const openingCounts = new Map<string, number>();
    for (const m of messages) {
      const key = firstWords(m.body, 8);
      openingCounts.set(key, (openingCounts.get(key) ?? 0) + 1);
    }
    const repeated = Array.from(openingCounts.values()).some((count) => count > 1);
    if (repeated) {
      warnings.push({
        id: "repeated-wording",
        title: "Repeated wording",
        detail: "Two or more messages open with nearly identical wording.",
        suggestion: "Regenerate the affected messages, or enable A/B testing for more variety.",
      });
    }
  }

  return warnings;
}
