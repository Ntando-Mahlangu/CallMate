/**
 * Thrown for conditions a user can actually act on (e.g. "finish
 * onboarding first"). Anything else — config issues, provider outages,
 * unexpected exceptions — must never reach the client verbatim
 * (docs/outrun/01 "ERROR STATES": never expose technical errors).
 */
export class UserFacingError extends Error {}
