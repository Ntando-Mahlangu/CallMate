import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/session";
import { getCurrentOrganization } from "@/lib/org";
import { prisma } from "@/lib/prisma";

export type SearchResult = { type: string; label: string; sublabel: string | null; href: string };

const PER_TYPE_LIMIT = 5;

// docs/outrun/04 "GLOBAL SEARCH" gives natural-language examples ("Why
// did replies drop?"), but there's no intent-routing engine behind this
// yet — that overlaps with the still-pending real NLP work for prospect
// search (docs/outrun/06). Building a plain substring search across the
// org's own records today, and calling it "Search" rather than claiming
// natural-language understanding it doesn't have, is the honest version
// of this feature until that engine exists.
export async function GET(req: NextRequest) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const organization = await getCurrentOrganization(session.user.id);
  if (!organization) return NextResponse.json({ error: "No workspace found." }, { status: 404 });

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ results: [] });

  const [companies, campaigns, tasks, goals] = await Promise.all([
    prisma.company.findMany({
      where: { organizationId: organization.id, name: { contains: q, mode: "insensitive" } },
      select: { id: true, name: true, category: true },
      take: PER_TYPE_LIMIT,
    }),
    prisma.campaign.findMany({
      where: { organizationId: organization.id, name: { contains: q, mode: "insensitive" } },
      select: { id: true, name: true, status: true },
      take: PER_TYPE_LIMIT,
    }),
    prisma.task.findMany({
      where: { organizationId: organization.id, title: { contains: q, mode: "insensitive" } },
      select: { id: true, title: true, status: true },
      take: PER_TYPE_LIMIT,
    }),
    prisma.goal.findMany({
      where: { organizationId: organization.id, title: { contains: q, mode: "insensitive" } },
      select: { id: true, title: true, status: true },
      take: PER_TYPE_LIMIT,
    }),
  ]);

  const results: SearchResult[] = [
    ...companies.map((c) => ({
      type: "Prospect",
      label: c.name,
      sublabel: c.category,
      href: `/prospects/${c.id}`,
    })),
    ...campaigns.map((c) => ({
      type: "Campaign",
      label: c.name,
      sublabel: c.status,
      href: `/campaigns/${c.id}`,
    })),
    ...tasks.map((t) => ({
      type: "Task",
      label: t.title,
      sublabel: t.status,
      href: `/tasks`,
    })),
    ...goals.map((g) => ({
      type: "Goal",
      label: g.title,
      sublabel: g.status,
      href: `/goals`,
    })),
  ];

  return NextResponse.json({ results });
}
