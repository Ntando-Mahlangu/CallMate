/**
 * Thrown for conditions a user can actually act on (e.g. "finish
 * onboarding first"). Anything else — config issues, provider outages,
 * unexpected exceptions — must never reach the client verbatim
 * (docs/outrun/01 "ERROR STATES": never expose technical errors).
 */
export class UserFacingError extends Error {}

/**
 * A UserFacingError specifically for rate limiting (docs/outrun/15) — a
 * distinct subclass so route handlers can map it to 429 (retry later)
 * instead of the generic 403 (not allowed) other UserFacingErrors get.
 */
export class RateLimitError extends UserFacingError {}
