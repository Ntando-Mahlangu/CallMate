import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/session";
import { getCurrentOrganization } from "@/lib/org";
import { getLeadListsForOrg } from "@/lib/prospects/lead-lists";
import { LeadListsPageClient } from "@/components/prospects/lead-lists-page-client";

export default async function LeadListsPage() {
  const session = await getCurrentSession();
  if (!session) redirect("/sign-in");

  const organization = await getCurrentOrganization(session.user.id);
  if (!organization) redirect("/sign-in");

  const lists = await getLeadListsForOrg(organization.id);

  return <LeadListsPageClient initialLists={lists} />;
}
