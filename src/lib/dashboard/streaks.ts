import { prisma } from "@/lib/prisma";

export type GrowthStreaks = {
  growthStreakDays: number;
  weeklyReviewsCompleted: number;
  campaignsLaunched: number;
};

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// docs/outrun/04 "STREAK SYSTEM" ties the Growth Streak to completing
// "your Growth Mission" each day, but nothing persists a per-day
// mission-completion record. Rather than fabricate that signal, the
// streak here is honestly defined as consecutive calendar days (ending
// today or yesterday, so it doesn't reset at midnight before the user has
// had a chance to act today) with at least one logged Business Brain
// Event — i.e. a day Outrun recorded the org actually doing something.
export async function getGrowthStreaks(organizationId: string): Promise<GrowthStreaks> {
  const [recentEvents, weeklyReviewsCompleted, campaignsLaunched] = await Promise.all([
    prisma.event.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      take: 500,
      select: { createdAt: true },
    }),
    prisma.strategicReview.count({ where: { organizationId, period: "WEEKLY" } }),
    prisma.campaign.count({ where: { organizationId, status: { not: "DRAFT" } } }),
  ]);

  const activeDays = new Set(recentEvents.map((e) => dayKey(e.createdAt)));

  let cursor = new Date();
  if (!activeDays.has(dayKey(cursor))) {
    cursor = new Date(cursor.getTime() - 86_400_000);
  }

  let growthStreakDays = 0;
  while (activeDays.has(dayKey(cursor))) {
    growthStreakDays += 1;
    cursor = new Date(cursor.getTime() - 86_400_000);
  }

  return { growthStreakDays, weeklyReviewsCompleted, campaignsLaunched };
}
