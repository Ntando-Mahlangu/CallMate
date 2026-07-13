import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentSession } from "@/lib/session";
import { getCurrentOrganization } from "@/lib/org";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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

      {campaign.status === "READY" && (
        <Card className="border-[var(--color-accent)]/30 bg-[var(--color-accent)]/5">
          <p className="text-sm text-[var(--color-text-secondary)]">
            <span className="font-medium text-[var(--color-text-primary)]">
              Outreach is generated and ready to review.
            </span>{" "}
            Sending isn&apos;t connected yet — copy these messages manually for
            now, or connect an email provider to send them automatically once
            that&apos;s available.
          </p>
        </Card>
      )}

      <Card>
        <h2 className="mb-4 text-lg font-medium text-[var(--color-text-primary)]">
          Outreach ({campaign.messages.length})
        </h2>
        <div className="space-y-4">
          {campaign.messages.map((message) => (
            <div
              key={message.id}
              className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4"
            >
              <div className="flex items-center justify-between">
                <Link
                  href={`/prospects/${message.companyId}`}
                  className="text-sm font-medium text-[var(--color-accent)] hover:underline"
                >
                  {message.company.name}
                </Link>
              </div>
              <p className="mt-2 text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
                Subject
              </p>
              <p className="text-sm font-medium text-[var(--color-text-primary)]">
                {message.subject}
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm text-[var(--color-text-secondary)]">
                {message.body}
              </p>
            </div>
          ))}
          {campaign.messages.length === 0 && (
            <p className="text-sm text-[var(--color-text-muted)]">
              No outreach was generated for this campaign.
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}
