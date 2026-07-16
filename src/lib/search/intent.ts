export type SearchIntent =
  | { kind: "ask"; question: string }
  | { kind: "best-campaign" }
  | { kind: "lookup"; query: string };

const QUESTION_WORDS = new Set([
  "why",
  "how",
  "what",
  "when",
  "who",
  "which",
  "is",
  "are",
  "do",
  "does",
  "can",
  "could",
  "should",
  "would",
  "will",
]);

// docs/outrun/07's "Generate emails" etc. are commands, not lookups, so
// action verbs route the same way question words do.
const ACTION_VERBS = new Set([
  "generate",
  "write",
  "draft",
  "analyse",
  "analyze",
  "create",
  "compose",
  "explain",
  "summarize",
  "summarise",
]);

// docs/outrun/04 "GLOBAL SEARCH" gives "Why did replies drop?", "Generate
// emails.", and "Analyse my website." as examples — none of those are
// record lookups, and substring-matching them against company/campaign
// names would silently return nothing useful. This routes anything
// question- or command-shaped to the AI Coach (already grounded in full
// business memory, docs/outrun/10) instead of pretending a name search
// understood it. "Show my best campaign" is the one example that's a
// real, deterministic ranking Outrun's own data can answer directly —
// callers check that case first via classifySearchIntent's caller.
export function classifySearchIntent(rawQuery: string): SearchIntent {
  const query = rawQuery.trim();
  const lower = query.toLowerCase();
  const firstWord = lower.split(/\s+/)[0]?.replace(/[^a-z]/g, "") ?? "";

  if (/\b(best|top)\b/.test(lower) && /\bcampaigns?\b/.test(lower)) {
    return { kind: "best-campaign" };
  }

  if (query.endsWith("?") || QUESTION_WORDS.has(firstWord) || ACTION_VERBS.has(firstWord)) {
    return { kind: "ask", question: query };
  }

  return { kind: "lookup", query };
}
