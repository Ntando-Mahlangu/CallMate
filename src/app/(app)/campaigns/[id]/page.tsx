import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentSession } from "@/lib/session";
import { getCurrentOrganization } from "@/lib/org";
import { prisma } from "@/lib/prisma";
import { isEmailSendingConfigured } from "@/lib/email";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CampaignSendPanel } from "@/components/campaigns/campaign-send-panel";

const STATUS_TONE = {
  DRAFT: "low",
  READY: "high",
  PAUSED: "medium",
  COMPLETED: "accent",
} as const;

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getCurrentSession();
  if (!session) redirect("/sign-in");

  const organization = await getCurrentOrganization(session.user.id);
  if (!organization) redirect("/sign-in");

  const { id } = await params;
  const campaign = await prisma.campaign.findFirst({
    where: { id, organizationId: organization.id },
    include: { messages: { include: { company: true }, orderBy: { createdAt: "asc" } } },
  });
  if (!campaign) notFound();

  return (
    <div className="animate-fade-in space-y-6">
      <Link href="/campaigns" className="text-sm text-[var(--color-accent)] hover:underline">
        ← Campaigns
      </Link>

      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-light tracking-tight text-[var(--color-text-primary)]">
            {campaign.name}
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{campaign.objective}</p>
        </div>
        <Badge tone={STATUS_TONE[campaign.status]}>{campaign.status}</Badge>
      </div>

      {campaign.strategyRationale && (
        <Card>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-[var(--color-text-primary)]">
              AI Campaign Strategy
            </h2>
            {campaign.strategyConfidence && (
              <Badge
                tone={
                  campaign.strategyConfidence === "High"
                    ? "high"
                    : campaign.strategyConfidence === "Medium"
                      ? "medium"
                      : "low"
                }
              >
                {campaign.strategyConfidence} confidence
              </Badge>
            )}
          </div>
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
            {campaign.strategyRationale}
          </p>
        </Card>
      )}

      <CampaignSendPanel
        campaignId={campaign.id}
        initialMessages={campaign.messages}
        emailConfigured={isEmailSendingConfigured()}
      />
    </div>
  );
}
