import { prisma } from "@/lib/prisma";

export type CampaignOverviewItem = {
  id: string;
  name: string;
  status: "DRAFT" | "READY" | "PAUSED" | "COMPLETED";
  companiesCount: number;
  repliesCount: number;
  sentCount: number;
};

export type CampaignOverview = {
  runningCount: number;
  draftCount: number;
  pausedCount: number;
  completedCount: number;
  recent: CampaignOverviewItem[];
};

// docs/outrun/04 "CAMPAIGN OVERVIEW" groups by Running/Scheduled/
// Completed/Paused. This schema's CampaignStatus is DRAFT/READY/PAUSED/
// COMPLETED — there's no separate "scheduled" state, so READY (outreach
// generated, ready to send or actively sending) is treated as "Running"
// and DRAFT as its own bucket rather than a fabricated "Scheduled" one.
// Meetings and pipeline value aren't tracked anywhere in this schema
// (see business-snapshot.ts), so per-campaign cards show real reply
// counts only — never an invented meeting/pipeline figure.
export async function getCampaignOverview(organizationId: string): Promise<CampaignOverview> {
  const [runningCount, draftCount, pausedCount, completedCount, campaigns] = await Promise.all([
    prisma.campaign.count({ where: { organizationId, status: "READY" } }),
    prisma.campaign.count({ where: { organizationId, status: "DRAFT" } }),
    prisma.campaign.count({ where: { organizationId, status: "PAUSED" } }),
    prisma.campaign.count({ where: { organizationId, status: "COMPLETED" } }),
    prisma.campaign.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      take: 4,
      select: {
        id: true,
        name: true,
        status: true,
        messages: { select: { companyId: true, sendStatus: true, gotReply: true } },
      },
    }),
  ]);

  const recent: CampaignOverviewItem[] = campaigns.map((c) => ({
    id: c.id,
    name: c.name,
    status: c.status,
    companiesCount: new Set(c.messages.map((m) => m.companyId)).size,
    sentCount: c.messages.filter((m) => m.sendStatus === "SENT").length,
    repliesCount: c.messages.filter((m) => m.sendStatus === "SENT" && m.gotReply).length,
  }));

  return { runningCount, draftCount, pausedCount, completedCount, recent };
}
