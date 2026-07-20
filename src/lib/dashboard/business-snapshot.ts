import { prisma } from "@/lib/prisma";

export type BusinessSnapshot = {
  revenueGoal: { title: string; targetValue: number; currentValue: number; targetDate: Date | null } | null;
  campaignsRunning: number;
  meetingsBooked: null;
  replyRate: number | null;
  positiveReplies: number;
  customersWon: number;
  pipelineValue: { estimate: number; qualifiedCount: number; avgCustomerValue: number } | null;
};

// docs/outrun/04 "BUSINESS SNAPSHOT" lists Meetings Booked and Pipeline
// Value alongside the other metrics. Nothing in this schema tracks a
// booked meeting, so meetingsBooked stays `null` (Article IV/VIII: never
// invent a figure). Pipeline Value IS honestly computable, though: it's
// the business's own stated avgCustomerValue (BusinessProfile, set during
// onboarding) times how many contacts have actually been qualified as a
// real opportunity (Contact.relationshipStatus === "QUALIFIED", a plain
// user-reported signal set from the prospect detail page) — a procedural
// estimate, not an AI guess, and null whenever either input is missing.
export async function getBusinessSnapshot(organizationId: string): Promise<BusinessSnapshot> {
  const [revenueGoal, campaignsRunning, sentMessages, positiveReplies, customersWon, businessProfile, qualifiedCount] =
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
      prisma.businessProfile.findUnique({
        where: { organizationId },
        select: { avgCustomerValue: true },
      }),
      prisma.contact.count({
        where: { company: { organizationId }, relationshipStatus: "QUALIFIED" },
      }),
    ]);

  const avgCustomerValue = businessProfile?.avgCustomerValue ?? null;
  const pipelineValue =
    avgCustomerValue != null && qualifiedCount > 0
      ? { estimate: avgCustomerValue * qualifiedCount, qualifiedCount, avgCustomerValue }
      : null;

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
    pipelineValue,
  };
}
