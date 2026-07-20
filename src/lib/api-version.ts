// docs/outrun/11 "API DESIGN — Clear versioning." Single source of truth for
// the API's version — read by src/proxy.ts (which stamps it onto every
// /api/* response as X-API-Version) and /api/health (which echoes it in the
// body for callers that can't read headers). Bump only when a change
// actually breaks an existing request/response shape; most feature
// additions land inside v1 without a bump.
export const API_VERSION = "v1";
