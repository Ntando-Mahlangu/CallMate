import type { MembershipRole } from "@prisma/client";

// docs/outrun/14 "PERMISSIONS" — Owner: everything; Admin: workspace, users,
// campaigns, billing. Manager/Member/Viewer never manage team membership.
const TEAM_MANAGERS: MembershipRole[] = ["OWNER", "ADMIN"];

export function canManageTeam(role: MembershipRole): boolean {
  return TEAM_MANAGERS.includes(role);
}

// Same Owner/Admin set as canManageTeam (doc 14 lists "Campaigns" under
// Admin permissions) — named separately so call sites read clearly, since
// this gates Autonomous Growth Mode (real unsupervised sends), not team
// membership.
export function canManageCampaigns(role: MembershipRole): boolean {
  return TEAM_MANAGERS.includes(role);
}

// Same Owner/Admin set — gates requesting a refund (docs/outrun/14
// "REFUNDS"), a real financial action, not just viewing plan info.
export function canManageBilling(role: MembershipRole): boolean {
  return TEAM_MANAGERS.includes(role);
}
