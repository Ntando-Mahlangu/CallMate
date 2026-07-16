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

// Same Owner/Admin set — gates issuing/revoking API keys (docs/outrun/11
// "Audit API access"), a credential-issuance action, not just viewing.
export function canManageApiKeys(role: MembershipRole): boolean {
  return TEAM_MANAGERS.includes(role);
}

// docs/outrun/14 "PERMISSIONS" — Owner: everything; Admin's own list
// ("Manage Workspace, Billing, Users, Campaigns") stops short of
// destroying the workspace itself. Owner-only, unlike every other
// TEAM_MANAGERS check above.
export function canDeleteOrganization(role: MembershipRole): boolean {
  return role === "OWNER";
}
