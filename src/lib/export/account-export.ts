import { prisma } from "@/lib/prisma";

/**
 * Article XVIII "Users own their data. Users can export it." — the
 * counterpart to src/lib/teams/delete-organization.ts's real deletion
 * flow. Every table an organization's own users can see gets a row here;
 * anything that's pure auth/security infrastructure (Account tokens,
 * ApiKey hashes, Session/Verification rows) is deliberately excluded —
 * it isn't "their business data," and exporting it would be a security
 * regression, not a data-ownership win.
 */
export async function buildAccountExport(organizationId: string) {
  const [
    organization,
    businessProfile,
    memberships,
    growthBlueprints,
    companies,
    campaigns,
    tasks,
    goals,
    leadLists,
    seoAnalyses,
    seoContentPieces,
    events,
    chatMessages,
    apiKeys,
    webhookEndpoints,
  ] = await Promise.all([
    prisma.organization.findUniqueOrThrow({
      where: { id: organizationId },
      select: {
        id: true,
        name: true,
        website: true,
        industry: true,
        country: true,
        growthStage: true,
        brandVoice: true,
        planTier: true,
        subscriptionStatus: true,
        createdAt: true,
      },
    }),
    prisma.businessProfile.findUnique({ where: { organizationId } }),
    prisma.membership.findMany({
      where: { organizationId },
      select: { id: true, role: true, createdAt: true, user: { select: { name: true, email: true } } },
    }),
    prisma.growthBlueprint.findMany({ where: { organizationId }, orderBy: { version: "asc" } }),
    prisma.company.findMany({
      where: { organizationId },
      include: {
        contacts: true,
        outreachMessages: { select: { id: true, subject: true, body: true, sendStatus: true, sentAt: true, gotReply: true, campaignId: true } },
      },
    }),
    prisma.campaign.findMany({ where: { organizationId } }),
    prisma.task.findMany({ where: { organizationId } }),
    prisma.goal.findMany({ where: { organizationId } }),
    prisma.leadList.findMany({
      where: { organizationId },
      include: { companies: { select: { companyId: true } } },
    }),
    prisma.seoAnalysis.findMany({ where: { organizationId }, orderBy: { version: "asc" } }),
    prisma.seoContentPiece.findMany({ where: { organizationId } }),
    prisma.event.findMany({ where: { organizationId }, orderBy: { createdAt: "asc" } }),
    prisma.chatMessage.findMany({ where: { organizationId }, orderBy: { createdAt: "asc" } }),
    prisma.apiKey.findMany({
      where: { organizationId },
      select: { id: true, name: true, keyPrefix: true, createdAt: true, lastUsedAt: true, revokedAt: true },
    }),
    prisma.webhookEndpoint.findMany({
      where: { organizationId },
      select: { id: true, url: true, enabled: true, createdAt: true },
    }),
  ]);

  return {
    exportedAt: new Date().toISOString(),
    organization,
    businessProfile,
    teamMembers: memberships,
    growthBlueprints,
    companies,
    campaigns,
    tasks,
    goals,
    leadLists,
    seoAnalyses,
    seoContentPieces,
    growthTimeline: events,
    aiChatHistory: chatMessages,
    apiKeys,
    webhookEndpoints,
  };
}
