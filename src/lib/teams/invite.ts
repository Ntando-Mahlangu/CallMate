import type { MembershipRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { UserFacingError } from "@/lib/errors";
import { sendEmail } from "@/lib/email";
import { logEvent, EventType } from "@/lib/memory/log-event";
import { canManageTeam } from "./permissions";

const INVITATION_TTL_DAYS = 7;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function assertCanManageTeam(role: MembershipRole) {
  if (!canManageTeam(role)) {
    throw new UserFacingError("Only workspace owners and admins can manage the team.");
  }
}

export async function createInvitation(
  organizationId: string,
  actingUserId: string,
  actingRole: MembershipRole,
  email: string,
  role: MembershipRole,
) {
  assertCanManageTeam(actingRole);

  const normalizedEmail = email.trim().toLowerCase();
  if (!EMAIL_RE.test(normalizedEmail)) {
    throw new UserFacingError("Enter a valid email address.");
  }
  if (role === "OWNER") {
    throw new UserFacingError("Ownership can't be assigned through an invitation.");
  }

  const [organization, existingMember, existingInvitation] = await Promise.all([
    prisma.organization.findUniqueOrThrow({ where: { id: organizationId } }),
    prisma.membership.findFirst({
      where: { organizationId, user: { email: normalizedEmail } },
    }),
    prisma.invitation.findFirst({
      where: { organizationId, email: normalizedEmail, status: "PENDING" },
    }),
  ]);
  if (existingMember) {
    throw new UserFacingError("This person is already a member of your workspace.");
  }
  if (existingInvitation) {
    throw new UserFacingError(
      "There's already a pending invitation for this email. Resend it instead.",
    );
  }

  const invitation = await prisma.invitation.create({
    data: {
      organizationId,
      email: normalizedEmail,
      role,
      token: crypto.randomUUID(),
      invitedByUserId: actingUserId,
      expiresAt: new Date(Date.now() + INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000),
    },
  });

  await sendInvitationEmail(invitation.token, normalizedEmail, organization.name);
  await logEvent(organizationId, EventType.TEAM_MEMBER_INVITED, `Invited ${normalizedEmail} as ${role}`);

  return invitation;
}

async function sendInvitationEmail(token: string, email: string, organizationName: string) {
  const link = `${APP_URL}/invite/${token}`;
  await sendEmail({
    to: email,
    subject: `You've been invited to join ${organizationName} on Outrun`,
    text: `You've been invited to join ${organizationName} on Outrun.\n\nAccept the invitation: ${link}\n\nThis link expires in ${INVITATION_TTL_DAYS} days.`,
  });
}

export async function resendInvitation(
  organizationId: string,
  actingRole: MembershipRole,
  invitationId: string,
) {
  assertCanManageTeam(actingRole);

  const invitation = await prisma.invitation.findFirst({
    where: { id: invitationId, organizationId },
    include: { organization: true },
  });
  if (!invitation || invitation.status !== "PENDING") {
    throw new UserFacingError("That invitation is no longer pending.");
  }

  const refreshed = await prisma.invitation.update({
    where: { id: invitation.id },
    data: { expiresAt: new Date(Date.now() + INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000) },
  });

  await sendInvitationEmail(refreshed.token, refreshed.email, invitation.organization.name);
  return refreshed;
}

export async function cancelInvitation(
  organizationId: string,
  actingRole: MembershipRole,
  invitationId: string,
) {
  assertCanManageTeam(actingRole);

  const invitation = await prisma.invitation.findFirst({
    where: { id: invitationId, organizationId },
  });
  if (!invitation || invitation.status !== "PENDING") {
    throw new UserFacingError("That invitation is no longer pending.");
  }

  return prisma.invitation.update({
    where: { id: invitation.id },
    data: { status: "CANCELLED" },
  });
}

export async function acceptInvitation(token: string, user: { id: string; email: string }) {
  const invitation = await prisma.invitation.findUnique({ where: { token } });
  if (!invitation) {
    throw new UserFacingError("This invitation link isn't valid.");
  }
  if (invitation.status === "CANCELLED") {
    throw new UserFacingError("This invitation was cancelled by the workspace owner.");
  }
  if (invitation.status === "EXPIRED" || invitation.expiresAt < new Date()) {
    if (invitation.status === "PENDING") {
      await prisma.invitation.update({ where: { id: invitation.id }, data: { status: "EXPIRED" } });
    }
    throw new UserFacingError("This invitation has expired. Ask the workspace owner to resend it.");
  }
  if (invitation.email.toLowerCase() !== user.email.toLowerCase()) {
    throw new UserFacingError(
      `This invitation was sent to ${invitation.email}. Sign in with that email to accept it.`,
    );
  }

  const existingMembership = await prisma.membership.findUnique({
    where: { userId_organizationId: { userId: user.id, organizationId: invitation.organizationId } },
  });

  if (!existingMembership) {
    await prisma.membership.create({
      data: { userId: user.id, organizationId: invitation.organizationId, role: invitation.role },
    });
    await logEvent(invitation.organizationId, EventType.TEAM_MEMBER_JOINED, `${user.email} joined the workspace`);
  }

  if (invitation.status !== "ACCEPTED") {
    await prisma.invitation.update({ where: { id: invitation.id }, data: { status: "ACCEPTED" } });
  }

  return invitation.organizationId;
}

export async function removeMember(
  organizationId: string,
  actingRole: MembershipRole,
  actingUserId: string,
  targetMembershipId: string,
) {
  assertCanManageTeam(actingRole);

  const target = await prisma.membership.findFirst({
    where: { id: targetMembershipId, organizationId },
  });
  if (!target) {
    throw new UserFacingError("That team member could not be found.");
  }
  if (target.userId === actingUserId) {
    throw new UserFacingError("You can't remove yourself from the workspace.");
  }
  if (target.role === "OWNER") {
    throw new UserFacingError("The workspace owner can't be removed.");
  }

  await prisma.membership.delete({ where: { id: target.id } });
}

export async function updateMemberRole(
  organizationId: string,
  actingRole: MembershipRole,
  targetMembershipId: string,
  newRole: MembershipRole,
) {
  assertCanManageTeam(actingRole);

  if (newRole === "OWNER") {
    throw new UserFacingError("Ownership can't be transferred here.");
  }

  const target = await prisma.membership.findFirst({
    where: { id: targetMembershipId, organizationId },
  });
  if (!target) {
    throw new UserFacingError("That team member could not be found.");
  }
  if (target.role === "OWNER") {
    throw new UserFacingError("The workspace owner's role can't be changed.");
  }

  return prisma.membership.update({ where: { id: target.id }, data: { role: newRole } });
}
