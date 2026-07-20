import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { deleteOrganization } from "./delete-organization";
import { UserFacingError } from "@/lib/errors";

// revalidateTag requires Next's request-scoped runtime (see src/lib/org.ts's
// own note on this); outside of it, it throws "static generation store
// missing". Mocked here so this file can test the actual business logic
// (permissions, confirmation, audit log, soft delete) in plain vitest.
vi.mock("next/cache", () => ({ revalidateTag: vi.fn() }));

describe("deleteOrganization (integration)", () => {
  let organizationId: string;
  const ORG_NAME = "Delete Org Test Workspace";

  beforeEach(async () => {
    const org = await prisma.organization.create({ data: { name: ORG_NAME } });
    organizationId = org.id;
  });

  afterEach(async () => {
    await prisma.organization.deleteMany({ where: { id: organizationId } });
  });

  it("soft-deletes when the owner confirms with the exact workspace name", async () => {
    const result = await deleteOrganization(organizationId, "user-1", "OWNER", ORG_NAME);
    expect(result.deletedAt).not.toBeNull();

    const row = await prisma.organization.findUniqueOrThrow({ where: { id: organizationId } });
    expect(row.deletedAt).not.toBeNull();
  });

  it("logs a WORKSPACE_DELETED audit event", async () => {
    await deleteOrganization(organizationId, "user-1", "OWNER", ORG_NAME);
    const logs = await prisma.auditLog.findMany({ where: { organizationId } });
    expect(logs).toHaveLength(1);
    expect(logs[0]?.action).toBe("WORKSPACE_DELETED");
    expect(logs[0]?.actorUserId).toBe("user-1");
  });

  it("rejects a non-owner, even an admin", async () => {
    await expect(deleteOrganization(organizationId, "user-1", "ADMIN", ORG_NAME)).rejects.toThrow(
      UserFacingError,
    );
    const row = await prisma.organization.findUniqueOrThrow({ where: { id: organizationId } });
    expect(row.deletedAt).toBeNull();
  });

  it("rejects a confirmation name that doesn't match exactly", async () => {
    await expect(
      deleteOrganization(organizationId, "user-1", "OWNER", "Wrong Name"),
    ).rejects.toThrow("Type the workspace name exactly to confirm deletion.");
    const row = await prisma.organization.findUniqueOrThrow({ where: { id: organizationId } });
    expect(row.deletedAt).toBeNull();
  });

  it("rejects deleting an already-deleted organization", async () => {
    await deleteOrganization(organizationId, "user-1", "OWNER", ORG_NAME);
    await expect(deleteOrganization(organizationId, "user-1", "OWNER", ORG_NAME)).rejects.toThrow(
      "That workspace could not be found.",
    );
  });
});
