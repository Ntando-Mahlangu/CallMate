import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentSession } from "@/lib/session";
import { getCurrentOrganization } from "@/lib/org";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/cn";

const STATUS_TONE = {
  DRAFT: "low",
  READY: "high",
  PAUSED: "medium",
  COMPLETED: "accent",
} as const;

export default async function CampaignsPage() {
  const session = await getCurrentSession();
  if (!session) redirect("/sign-in");

  const organization = await getCurrentOrganization(session.user.id);
  if (!organization) redirect("/sign-in");

  const campaigns = await prisma.campaign.findMany({
    where: { organizationId: organization.id },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { messages: true } } },
  });

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-light tracking-tight text-[var(--color-text-primary)]">
            Campaigns
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            Batch outreach across a chosen audience of researched prospects.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/campaigns/library"
            className="text-sm text-[var(--color-accent)] hover:underline"
          >
            Campaign Library
          </Link>
          <Link href="/campaigns/new" className={cn(buttonVariants())}>
            Create Campaign
          </Link>
        </div>
      </div>

      {campaigns.length === 0 ? (
        <Card className="text-center">
          <p className="text-[var(--color-text-secondary)]">
            You haven&apos;t created your first campaign yet. Research a few
            prospects, then build a campaign around them.
          </p>
          <Link href="/campaigns/new" className={cn(buttonVariants(), "mt-4 inline-flex")}>
            Create Campaign
          </Link>
        </Card>
      ) : (
        <div className="space-y-4">
          {campaigns.map((campaign) => (
            <Link key={campaign.id} href={`/campaigns/${campaign.id}`}>
              <Card className="transition-colors hover:border-[var(--color-accent)]/40">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium text-[var(--color-text-primary)]">
                      {campaign.name}
                    </p>
                    <p className="text-sm text-[var(--color-text-secondary)]">
                      {campaign.objective}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-[var(--color-text-muted)]">
                      {campaign._count.messages} message
                      {campaign._count.messages === 1 ? "" : "s"}
                    </span>
                    <Badge tone={STATUS_TONE[campaign.status]}>{campaign.status}</Badge>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
