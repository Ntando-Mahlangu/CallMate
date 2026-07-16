import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { UserFacingError } from "@/lib/errors";
import { createInvitation, getSeatUsage } from "./invite";

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
