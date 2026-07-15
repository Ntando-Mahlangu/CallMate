import { prisma } from "@/lib/prisma";

export type BusinessSnapshot = {
  revenueGoal: { title: string; targetValue: number; currentValue: number; targetDate: Date | null } | null;
  campaignsRunning: number;
  meetingsBooked: null;
  replyRate: number | null;
  positiveReplies: number;
  customersWon: number;
  pipelineValue: null;
};

// docs/outrun/04 "BUSINESS SNAPSHOT" lists Meetings Booked and Pipeline
// Value alongside the other metrics, but nothing in this schema tracks a
// meeting or a deal amount (docs/outrun/12's Contact model only carries a
// relationship *status*, not a monetary value or a booked-meeting flag).
// Rather than invent a number, both fields are typed `null` here and the
// dashboard renders them as "Not tracked yet" — Article IV/VIII: never
// present a fabricated figure as a real one.
export async function getBusinessSnapshot(organizationId: string): Promise<BusinessSnapshot> {
  const [revenueGoal, campaignsRunning, sentMessages, positiveReplies, customersWon] =
    await Promise.all([
      prisma.goal.findFirst({
        where: {
          organizationId,
          status: "ACTIVE",
          targetMetric: { contains: "revenue", mode: "insensitive" },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.campaign.count({ where: { organizationId, status: "READY" } }),
      prisma.outreachMessage.count({
        where: { company: { organizationId }, sendStatus: "SENT" },
      }),
      prisma.outreachMessage.count({
        where: { company: { organizationId }, sendStatus: "SENT", gotReply: true },
      }),
      prisma.contact.count({
        where: { company: { organizationId }, relationshipStatus: "CUSTOMER" },
      }),
    ]);

  return {
    revenueGoal: revenueGoal
      ? {
          title: revenueGoal.title,
          targetValue: revenueGoal.targetValue ?? 0,
          currentValue: revenueGoal.currentValue ?? 0,
          targetDate: revenueGoal.targetDate,
        }
      : null,
    campaignsRunning,
    meetingsBooked: null,
    replyRate: sentMessages > 0 ? Math.round((positiveReplies / sentMessages) * 100) : null,
    positiveReplies,
    customersWon,
    pipelineValue: null,
  };
}
