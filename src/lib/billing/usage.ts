import { UsageEventType, type PlanTier } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { UserFacingError } from "@/lib/errors";

// docs/outrun/14 — Free/Starter allotments. Growth/Unlimited aren't sold yet
// (no Paddle price exists for them), so they're intentionally left
// unlimited rather than gated on numbers nobody has agreed to.
const LIMITS: Partial<Record<PlanTier, Record<UsageEventType, number>>> = {
  FREE: {
    [UsageEventType.COMPANY_SEARCH]: 10,
    [UsageEventType.COMPANY_RESEARCH]: 10,
    [UsageEventType.OUTREACH_GENERATION]: 5,
    [UsageEventType.BLUEPRINT_GENERATION]: 1,
  },
  STARTER: {
    [UsageEventType.COMPANY_SEARCH]: 250,
    [UsageEventType.COMPANY_RESEARCH]: 250,
    [UsageEventType.OUTREACH_GENERATION]: 500,
    [UsageEventType.BLUEPRINT_GENERATION]: 1_000_000, // "unlimited" in practice
  },
};

const UPGRADE_MESSAGE: Record<UsageEventType, string> = {
  [UsageEventType.COMPANY_SEARCH]:
    "Great start — you've used all your Free searches. Upgrade to Starter to keep finding qualified companies.",
  [UsageEventType.COMPANY_RESEARCH]:
    "You've used all your Free AI company reports. Upgrade to Starter to keep researching prospects.",
  [UsageEventType.OUTREACH_GENERATION]:
    "You've used all your Free outreach generations. Upgrade to Starter to keep writing outreach.",
  [UsageEventType.BLUEPRINT_GENERATION]:
    "The Free plan includes one Growth Blueprint. Upgrade to Starter for unlimited Blueprint updates.",
};

/**
 * Call before performing a billable action. Throws a friendly
 * UserFacingError once the org's plan allotment is exhausted; otherwise
 * records the event and lets the caller proceed. This is the single
 * enforcement point — nothing about plan limits lives in the UI layer.
 */
export async function checkAndRecordUsage(organizationId: string, type: UsageEventType) {
  const organization = await prisma.organization.findUniqueOrThrow({
    where: { id: organizationId },
    select: { planTier: true },
  });

  const limit = LIMITS[organization.planTier]?.[type];
  if (limit != null) {
    const used = await prisma.usageEvent.count({
      where: { organizationId, type },
    });
    if (used >= limit) {
      throw new UserFacingError(UPGRADE_MESSAGE[type]);
    }
  }

  await prisma.usageEvent.create({ data: { organizationId, type } });
}

export async function getUsageSummary(organizationId: string, planTier: PlanTier) {
  const types = Object.values(UsageEventType);
  const counts = await Promise.all(
    types.map((type) =>
      prisma.usageEvent.count({ where: { organizationId, type } }),
    ),
  );

  return types.map((type, i) => ({
    type,
    used: counts[i] ?? 0,
    limit: LIMITS[planTier]?.[type] ?? null,
  }));
}
