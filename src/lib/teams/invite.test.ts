import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { UserFacingError } from "@/lib/errors";
import { createInvitation, acceptInvitation, getSeatUsage } from "./invite";

describe("team seat limits (integration)", () => {
  let organizationId: string;
  let ownerUserId: string;

  async function makeOrg(planTier: "FREE" | "STARTER" | "GROWTH" | "UNLIMITED") {
    const owner = await prisma.user.create({
      data: { name: "Seat Owner", email: `seat-owner-${Date.now()}-${Math.random()}@example.com` },
    });
    const org = await prisma.organization.create({
      data: {
        name: "Seat Limits Test Org",
        planTier,
        memberships: { create: { userId: owner.id, role: "OWNER" } },
      },
    });
    return { organizationId: org.id, ownerUserId: owner.id };
  }

  afterEach(async () => {
    if (organizationId) {
      await prisma.invitation.deleteMany({ where: { organizationId } });
      await prisma.membership.deleteMany({ where: { organizationId } });
      await prisma.organization.deleteMany({ where: { id: organizationId } });
    }
    if (ownerUserId) await prisma.user.deleteMany({ where: { id: ownerUserId } });
  });

  it("reports 1 used / 1 limit for a fresh Free-tier org (owner only)", async () => {
    ({ organizationId, ownerUserId } = await makeOrg("FREE"));
    const seats = await getSeatUsage(organizationId, "FREE");
    expect(seats).toEqual({ used: 1, limit: 1 });
  });

  it("rejects an invitation on a Free-tier org already at its 1-seat cap", async () => {
    ({ organizationId, ownerUserId } = await makeOrg("FREE"));
    await expect(
      createInvitation(organizationId, ownerUserId, "OWNER", "new-member@example.com", "MEMBER"),
    ).rejects.toThrow(UserFacingError);
  });

  it("rejects an invitation on a Starter-tier org already at its 1-seat cap", async () => {
    ({ organizationId, ownerUserId } = await makeOrg("STARTER"));
    await expect(
      createInvitation(organizationId, ownerUserId, "OWNER", "new-member@example.com", "MEMBER"),
    ).rejects.toThrow(UserFacingError);
  });

  it("counts a pending invitation as a claimed seat", async () => {
    ({ organizationId, ownerUserId } = await makeOrg("GROWTH"));
    await createInvitation(organizationId, ownerUserId, "OWNER", "invitee@example.com", "MEMBER");
    const seats = await getSeatUsage(organizationId, "GROWTH");
    expect(seats).toEqual({ used: 2, limit: null });
  });

  it("allows unlimited invitations on Growth (no seat cap)", async () => {
    ({ organizationId, ownerUserId } = await makeOrg("GROWTH"));
    await expect(
      createInvitation(organizationId, ownerUserId, "OWNER", "growth-invitee@example.com", "MEMBER"),
    ).resolves.toBeDefined();
  });

  it("allows unlimited invitations on Unlimited (no seat cap)", async () => {
    ({ organizationId, ownerUserId } = await makeOrg("UNLIMITED"));
    await expect(
      createInvitation(organizationId, ownerUserId, "OWNER", "unlimited-invitee@example.com", "MEMBER"),
    ).resolves.toBeDefined();
  });
});

describe("acceptInvitation and soft-deleted workspaces (integration)", () => {
  let organizationId: string;
  let ownerUserId: string;
  let inviteeUserId: string;

  afterEach(async () => {
    await prisma.invitation.deleteMany({ where: { organizationId } });
    await prisma.membership.deleteMany({ where: { organizationId } });
    await prisma.organization.deleteMany({ where: { id: organizationId } });
    await prisma.user.deleteMany({ where: { id: { in: [ownerUserId, inviteeUserId] } } });
  });

  it("rejects accepting an invitation to a workspace that was since soft-deleted", async () => {
    const owner = await prisma.user.create({
      data: { name: "Invite Owner", email: `invite-owner-${Date.now()}@example.com` },
    });
    ownerUserId = owner.id;
    const org = await prisma.organization.create({
      data: {
        name: "Accept Invite Test Org",
        planTier: "GROWTH", // no seat cap — this test isn't about seat limits
        memberships: { create: { userId: owner.id, role: "OWNER" } },
      },
    });
    organizationId = org.id;

    const invitee = await prisma.user.create({
      data: { name: "Invitee", email: `invitee-${Date.now()}@example.com` },
    });
    inviteeUserId = invitee.id;

    const invitation = await createInvitation(organizationId, ownerUserId, "OWNER", invitee.email, "MEMBER");

    // deleteOrganization itself never cancels outstanding invitations
    // (that's a separate, pre-existing gap) — simulating the resulting
    // state directly rather than depending on that unrelated flow.
    await prisma.organization.update({ where: { id: organizationId }, data: { deletedAt: new Date() } });

    await expect(
      acceptInvitation(invitation.token, { id: invitee.id, email: invitee.email }),
    ).rejects.toThrow("This workspace no longer exists.");

    const membership = await prisma.membership.findUnique({
      where: { userId_organizationId: { userId: invitee.id, organizationId } },
    });
    expect(membership).toBeNull();
  });
});
