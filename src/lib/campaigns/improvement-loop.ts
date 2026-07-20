import { prisma } from "@/lib/prisma";
import { logEvent, EventType } from "@/lib/memory/log-event";

type SentMessage = {
  subject: string;
  gotReply: boolean;
  sentAt: Date | null;
  company: { category: string | null };
};

export type PatternInsight = {
  dimension: string;
  insight: string;
  winningBucket: string;
  winningRate: number;
  comparisonBucket: string;
  comparisonRate: number;
  sampleSize: number;
};

export type ImprovementLoopResult = {
  totalSent: number;
  minRequired: number;
  insufficientData: boolean;
  patterns: PatternInsight[];
};

// docs/outrun/07 "AI IMPROVEMENT LOOP" — every number here comes directly
// from real send/reply data (never AI-generated), and a pattern only
// surfaces once it clears both a minimum sample size and a minimum gap
// between buckets — the same honesty bar used for A/B testing
// (MIN_SENT_FOR_COMPARISON), so "Tuesday outperforms Friday" is never
// asserted off two data points.
const MIN_TOTAL_SENT = 10;
const MIN_BUCKET_SENT = 3;
const MIN_RATE_DELTA = 0.1;

function replyRate(messages: SentMessage[]): number | null {
  if (messages.length === 0) return null;
  return messages.filter((m) => m.gotReply).length / messages.length;
}

function subjectLengthBucket(subject: string): string {
  const len = subject.length;
  if (len <= 40) return "Short subject lines (≤40 characters)";
  if (len <= 70) return "Medium subject lines (41–70 characters)";
  return "Long subject lines (70+ characters)";
}

function dayOfWeekBucket(date: Date): string {
  return date.toLocaleDateString("en-US", { weekday: "long" });
}

function analyzeDimension(
  messages: SentMessage[],
  bucketFn: (m: SentMessage) => string,
  dimension: string,
): PatternInsight | null {
  const buckets = new Map<string, SentMessage[]>();
  for (const m of messages) {
    const key = bucketFn(m);
    const bucket = buckets.get(key);
    if (bucket) bucket.push(m);
    else buckets.set(key, [m]);
  }

  const stats = Array.from(buckets.entries())
    .map(([key, msgs]) => ({ key, rate: replyRate(msgs), count: msgs.length }))
    .filter(
      (b): b is { key: string; rate: number; count: number } =>
        b.rate !== null && b.count >= MIN_BUCKET_SENT,
    )
    .sort((a, b) => b.rate - a.rate);

  if (stats.length < 2) return null;

  const winner = stats[0]!;
  const runnerUp = stats[1]!;
  if (winner.rate - runnerUp.rate < MIN_RATE_DELTA) return null;

  const winningRate = Math.round(winner.rate * 100);
  const comparisonRate = Math.round(runnerUp.rate * 100);

  return {
    dimension,
    winningBucket: winner.key,
    winningRate,
    comparisonBucket: runnerUp.key,
    comparisonRate,
    sampleSize: winner.count + runnerUp.count,
    insight: `${winner.key} had a ${winningRate}% reply rate vs ${comparisonRate}% for ${runnerUp.key}.`,
  };
}

export async function analyzeOutreachPatterns(organizationId: string): Promise<ImprovementLoopResult> {
  const messages = await prisma.outreachMessage.findMany({
    where: { company: { organizationId }, sendStatus: "SENT" },
    select: { subject: true, gotReply: true, sentAt: true, company: { select: { category: true } } },
  });

  if (messages.length < MIN_TOTAL_SENT) {
    return { totalSent: messages.length, minRequired: MIN_TOTAL_SENT, insufficientData: true, patterns: [] };
  }

  const withCategory = messages.filter((m) => m.company.category);
  const withSentAt = messages.filter((m): m is SentMessage & { sentAt: Date } => m.sentAt !== null);

  const patterns = [
    analyzeDimension(messages, (m) => subjectLengthBucket(m.subject), "Subject Length"),
    analyzeDimension(withCategory, (m) => m.company.category!, "Industry"),
    analyzeDimension(withSentAt, (m) => dayOfWeekBucket(m.sentAt!), "Send Day"),
  ].filter((p): p is PatternInsight => p !== null);

  return { totalSent: messages.length, minRequired: MIN_TOTAL_SENT, insufficientData: false, patterns };
}

/** Re-runs the analysis fresh and logs each currently-detected pattern to the Business Brain. */
export async function saveOutreachPatternsToMemory(organizationId: string) {
  const result = await analyzeOutreachPatterns(organizationId);
  for (const pattern of result.patterns) {
    await logEvent(
      organizationId,
      EventType.PATTERN_IDENTIFIED,
      `${pattern.dimension} pattern: ${pattern.insight}`,
    );
  }
  return result;
}
