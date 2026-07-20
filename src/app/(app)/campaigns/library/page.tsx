import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/session";
import { getCurrentOrganization } from "@/lib/org";
import { getTemplatesForOrg } from "@/lib/campaigns/templates";
import { CampaignLibraryClient } from "@/components/campaigns/campaign-library-client";

export default async function CampaignLibraryPage() {
  const session = await getCurrentSession();
  if (!session) redirect("/sign-in");

  const organization = await getCurrentOrganization(session.user.id);
  if (!organization) redirect("/sign-in");

  const templates = await getTemplatesForOrg(organization.id);

  return <CampaignLibraryClient initialTemplates={templates} />;
}
