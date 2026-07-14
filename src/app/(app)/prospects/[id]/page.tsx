import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentSession } from "@/lib/session";
import { getCurrentOrganization } from "@/lib/org";
import { prisma } from "@/lib/prisma";
import { isEmailSendingConfigured } from "@/lib/email";
import { Card } from "@/components/ui/card";
import { ScoreBadge } from "@/components/prospects/score-badge";
import { ResearchPanel } from "@/components/prospects/research-panel";
import { OutreachPanel } from "@/components/prospects/outreach-panel";
import { CallScriptPanel } from "@/components/prospects/call-script-panel";
import { AddToListMenu } from "@/components/prospects/add-to-list-menu";
import type { CompanyResearchData } from "@/lib/prospects/research-schema";
import type { CallScriptData } from "@/lib/prospects/call-script-schema";

export default async function ProspectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getCurrentSession();
  if (!session) redirect("/sign-in");

  const organization = await getCurrentOrganization(session.user.id);
  if (!organization) redirect("/sign-in");

  const { id } = await params;
  const company = await prisma.company.findFirst({
    where: { id, organizationId: organization.id },
    include: { outreachMessages: { orderBy: { createdAt: "desc" } } },
  });
  if (!company) notFound();

  return (
    <div className="animate-fade-in space-y-6">
      <Link href="/prospects" className="text-sm text-[var(--color-accent)] hover:underline">
        ← Back to search
      </Link>

      <div>
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-2xl font-light tracking-tight text-[var(--color-text-primary)]">
            {company.name}
          </h1>
          <AddToListMenu companyId={company.id} />
        </div>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          {company.category ?? "Uncategorized"}
          {company.formattedAddress ? ` · ${company.formattedAddress}` : ""}
        </p>
        {company.website && (
          <a
            href={company.website}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-[var(--color-accent)] hover:underline"
          >
            {company.website}
          </a>
        )}
        <div className="mt-3 flex gap-2">
          <ScoreBadge label="Fit" score={company.fitScore ?? 0} reason={company.fitReason} />
          <ScoreBadge
            label="Confidence"
            score={company.confidenceScore ?? 0}
            reason={company.confidenceReason}
          />
        </div>
      </div>

      <Card>
        <h2 className="mb-4 text-lg font-medium text-[var(--color-text-primary)]">
          AI Research
        </h2>
        <ResearchPanel
          companyId={company.id}
          initialResearch={company.research as CompanyResearchData | null}
        />
      </Card>

      <Card>
        <h2 className="mb-4 text-lg font-medium text-[var(--color-text-primary)]">
          Outreach
        </h2>
        <OutreachPanel
          companyId={company.id}
          hasResearch={Boolean(company.research)}
          initialMessages={company.outreachMessages}
          initialContactEmail={company.contactEmail}
          emailConfigured={isEmailSendingConfigured()}
        />
      </Card>

      <Card>
        <h2 className="mb-4 text-lg font-medium text-[var(--color-text-primary)]">
          Cold Call Script
        </h2>
        <CallScriptPanel
          companyId={company.id}
          hasResearch={Boolean(company.research)}
          initialCallScript={company.callScript as CallScriptData | null}
        />
      </Card>
    </div>
  );
}
