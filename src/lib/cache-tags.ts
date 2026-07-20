// docs/outrun/12 "CACHING" — every tag is scoped by organizationId (never
// userId alone), since a user can belong to more than one workspace and
// the active one is resolved per-request. Call the matching revalidateTag()
// immediately after any write that touches the underlying rows.

export function orgProfileTag(organizationId: string) {
  return `org-profile:${organizationId}`;
}

export function growthBlueprintTag(organizationId: string) {
  return `growth-blueprint:${organizationId}`;
}
