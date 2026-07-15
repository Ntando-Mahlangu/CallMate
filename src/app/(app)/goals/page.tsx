import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/session";
import { getCurrentOrganization } from "@/lib/org";
import { prisma } from "@/lib/prisma";
import { GoalsPageClient } from "@/components/goals/goals-page-client";

export default async function GoalsPage() {
  const session = await getCurrentSession();
  if (!session) redirect("/sign-in");

  const organization = await getCurrentOrganization(session.user.id);
  if (!organization) redirect("/sign-in");

  const goals = await prisma.goal.findMany({
    where: { organizationId: organization.id },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  return <GoalsPageClient initialGoals={goals} />;
}
