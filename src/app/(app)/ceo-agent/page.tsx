import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/session";
import { getCurrentOrganization } from "@/lib/org";
import { prisma } from "@/lib/prisma";
import { ChatPanel } from "@/components/ceo-agent/chat-panel";
import { RiskPanel } from "@/components/ceo-agent/risk-panel";
import { WhatIfPanel } from "@/components/ceo-agent/whatif-panel";
import { OpportunityFeedPanel } from "@/components/ceo-agent/opportunity-feed-panel";
import { getRisksAndOpportunities } from "@/lib/ceo-agent/risks";
import { getOpportunityFeed } from "@/lib/ceo-agent/opportunity-feed";

export default async function CeoAgentPage() {
  const session = await getCurrentSession();
  if (!session) redirect("/sign-in");

  const organization = await getCurrentOrganization(session.user.id);
  if (!organization) redirect("/sign-in");

  const [history, signals, opportunities] = await Promise.all([
    prisma.chatMessage.findMany({
      where: { organizationId: organization.id },
      orderBy: { createdAt: "asc" },
    }),
    getRisksAndOpportunities(organization.id),
    getOpportunityFeed(organization.id),
  ]);

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-light tracking-tight text-[var(--color-text-primary)]">
          Ask the CEO
        </h1>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          Grounded in everything Outrun knows about {organization.name}.
        </p>
      </div>

      <RiskPanel signals={signals} />

      <OpportunityFeedPanel items={opportunities} />

      <WhatIfPanel />

      <ChatPanel
        initialMessages={history.map((m) => ({ role: m.role, content: m.content }))}
      />
    </div>
  );
}
