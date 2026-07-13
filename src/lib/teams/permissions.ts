import type { MembershipRole } from "@prisma/client";

// docs/outrun/14 "PERMISSIONS" — Owner: everything; Admin: workspace, users,
// campaigns, billing. Manager/Member/Viewer never manage team membership.
const TEAM_MANAGERS: MembershipRole[] = ["OWNER", "ADMIN"];

export function canManageTeam(role: MembershipRole): boolean {
  return TEAM_MANAGERS.includes(role);
}
