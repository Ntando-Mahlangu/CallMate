import { prisma } from "@/lib/prisma";

export type UpcomingTask = {
  id: string;
  title: string;
  impact: string;
  dueDate: Date | null;
};

export type RecentNotification = {
  id: string;
  title: string;
  link: string | null;
  createdAt: Date;
};

// docs/outrun/04 "Upcoming Tasks" implies due dates, but most tasks today
// (generated from the Growth Blueprint, see src/lib/tasks/generate-from-
// blueprint.ts) never get one — so sorting purely by dueDate would leave
// this empty for almost every real org. Tasks with a real due date sort
// first (soonest due), everything else follows by impact so the list is
// never empty just because due dates aren't set yet.
export async function getUpcomingTasks(organizationId: string, take: number): Promise<UpcomingTask[]> {
  const tasks = await prisma.task.findMany({
    where: { organizationId, status: "PENDING" },
    select: { id: true, title: true, impact: true, dueDate: true },
    take: 50,
  });

  const impactRank: Record<string, number> = { High: 0, Medium: 1, Low: 2 };

  tasks.sort((a, b) => {
    if (a.dueDate && b.dueDate) return a.dueDate.getTime() - b.dueDate.getTime();
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;
    return (impactRank[a.impact] ?? 3) - (impactRank[b.impact] ?? 3);
  });

  return tasks.slice(0, take);
}

export async function getRecentNotifications(
  organizationId: string,
  take: number,
): Promise<RecentNotification[]> {
  return prisma.notification.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true, link: true, createdAt: true },
    take,
  });
}
