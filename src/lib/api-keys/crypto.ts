import { randomBytes, createHash } from "node:crypto";

const KEY_PREFIX = "ok_live_";
const SECRET_BYTES = 24; // 32 URL-safe base64 characters of entropy

/**
 * Generates a new API key. The raw key is returned once for the caller to
 * show the user and is never persisted — only `hash` (SHA-256 hex) is
 * stored, and `displayPrefix` (a short, non-secret slice) lets a user tell
 * keys apart in the UI without ever re-revealing the secret.
 */
export function generateApiKey(): { rawKey: string; hash: string; displayPrefix: string } {
  const secret = randomBytes(SECRET_BYTES).toString("base64url");
  const rawKey = `${KEY_PREFIX}${secret}`;
  return {
    rawKey,
    hash: hashApiKey(rawKey),
    displayPrefix: rawKey.slice(0, KEY_PREFIX.length + 6),
  };
}

export function hashApiKey(rawKey: string): string {
  return createHash("sha256").update(rawKey).digest("hex");
}

export function looksLikeApiKey(value: string): boolean {
  return value.startsWith(KEY_PREFIX);
}
