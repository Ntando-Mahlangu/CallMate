import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentSession } from "@/lib/session";
import { getCurrentOrganization } from "@/lib/org";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { Card } from "@/components/ui/card";
import { NewCampaignForm } from "@/components/campaigns/new-campaign-form";

export default async function NewCampaignPage({
  searchParams,
}: {
  searchParams: Promise<{ templateId?: string }>;
}) {
  const session = await getCurrentSession();
  if (!session) redirect("/sign-in");

  const organization = await getCurrentOrganization(session.user.id);
  if (!organization) redirect("/sign-in");

  const { templateId } = await searchParams;

  const [companies, template] = await Promise.all([
    prisma.company.findMany({
      where: { organizationId: organization.id, research: { not: Prisma.DbNull } },
      orderBy: { fitScore: "desc" },
      select: { id: true, name: true, category: true, fitScore: true, fitReason: true, isSaved: true },
    }),
    templateId
      ? prisma.campaignTemplate.findFirst({
          where: { id: templateId, organizationId: organization.id },
        })
      : Promise.resolve(null),
  ]);

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <Link href="/campaigns" className="text-sm text-[var(--color-accent)] hover:underline">
          ← Campaigns
        </Link>
        <h1 className="mt-2 text-2xl font-light tracking-tight text-[var(--color-text-primary)]">
          Create Campaign
        </h1>
      </div>

      {companies.length === 0 ? (
        <Card>
          <p className="text-[var(--color-text-secondary)]">
            You need at least one researched prospect before building a
            campaign.{" "}
            <Link href="/prospects" className="text-[var(--color-accent)] hover:underline">
              Find and research some prospects first.
            </Link>
          </p>
        </Card>
      ) : (
        <NewCampaignForm
          companies={companies}
          initialValues={
            template
              ? { name: template.name, objective: template.objective, abTest: template.abTest }
              : undefined
          }
        />
      )}
    </div>
  );
}
