import { prisma } from "@/lib/prisma";
import { sendEmail, isEmailSendingConfigured } from "@/lib/email";
import { UserFacingError } from "@/lib/errors";
import { logEvent, EventType } from "@/lib/memory/log-event";
import { captureError } from "@/lib/observability";

/**
 * Sends one previously-generated OutreachMessage to its company's contact
 * email (docs/outrun/07). This is a distinct, explicit action from
 * generating the message — nothing goes out until a human clicks Send.
 */
export async function sendOutreachMessage(organizationId: string, messageId: string) {
  if (!isEmailSendingConfigured()) {
    throw new UserFacingError(
      "Email sending isn't configured yet. Add RESEND_API_KEY to send outreach.",
    );
  }

  const message = await prisma.outreachMessage.findFirst({
    where: { id: messageId, company: { organizationId } },
    include: { company: true },
  });
  if (!message) {
    throw new UserFacingError("That message could not be found.");
  }
  if (!message.company.contactEmail) {
    throw new UserFacingError(
      "Add a contact email for this prospect before sending.",
    );
  }

  try {
    await sendEmail({
      to: message.company.contactEmail,
      subject: message.subject,
      text: message.body,
    });
  } catch (error) {
    await prisma.outreachMessage.update({
      where: { id: message.id },
      data: { sendStatus: "FAILED" },
    });
    captureError("outreach.send", error, { organizationId, messageId });
    throw new UserFacingError(
      "We couldn't send that message right now. Please try again in a moment.",
    );
  }

  const updated = await prisma.outreachMessage.update({
    where: { id: message.id },
    data: { sendStatus: "SENT", sentAt: new Date() },
  });

  await logEvent(
    organizationId,
    EventType.OUTREACH_SENT,
    `Sent outreach to ${message.company.name} (${message.company.contactEmail}).`,
  );

  return updated;
}

/**
 * Sends every not-yet-sent message in a campaign that has a contact email,
 * one at a time so a single failure doesn't stop the rest. Returns a
 * summary rather than throwing on partial failure — the caller decides
 * how to surface per-message outcomes.
 */
export async function sendCampaignOutreach(organizationId: string, campaignId: string) {
  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, organizationId },
    include: { messages: { include: { company: true } } },
  });
  if (!campaign) {
    throw new UserFacingError("That campaign could not be found.");
  }

  if (!isEmailSendingConfigured()) {
    throw new UserFacingError(
      "Email sending isn't configured yet. Add RESEND_API_KEY to send outreach.",
    );
  }

  let sent = 0;
  let failed = 0;
  let skippedNoEmail = 0;

  for (const message of campaign.messages) {
    if (message.sendStatus === "SENT") continue;
    if (!message.company.contactEmail) {
      skippedNoEmail += 1;
      continue;
    }

    try {
      await sendOutreachMessage(organizationId, message.id);
      sent += 1;
    } catch {
      failed += 1;
    }
  }

  const messages = await prisma.outreachMessage.findMany({
    where: { campaignId },
    include: { company: true },
    orderBy: { createdAt: "asc" },
  });

  return { sent, failed, skippedNoEmail, messages };
}
