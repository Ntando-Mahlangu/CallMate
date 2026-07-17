import { createHash, createCipheriv, createDecipheriv, createHmac, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;
const AUTH_TAG_BYTES = 16;

// Mirrors Better Auth's own approach for encryptOAuthTokens (see
// src/lib/auth.ts): derive a 32-byte AES key by hashing the app secret,
// rather than requiring a second dedicated encryption-key env var.
function deriveKey(): Buffer {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) throw new Error("BETTER_AUTH_SECRET is not configured.");
  return createHash("sha256").update(secret).digest();
}

/**
 * Encrypts a webhook endpoint's signing secret for storage
 * (WebhookEndpoint.secretEncrypted). Unlike an API key's hash, this must
 * be reversible — Outrun needs the raw secret back at delivery time to
 * sign each payload.
 */
export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, deriveKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, ciphertext]).toString("base64");
}

export function decryptSecret(encoded: string): string {
  const raw = Buffer.from(encoded, "base64");
  const iv = raw.subarray(0, IV_BYTES);
  const authTag = raw.subarray(IV_BYTES, IV_BYTES + AUTH_TAG_BYTES);
  const ciphertext = raw.subarray(IV_BYTES + AUTH_TAG_BYTES);
  const decipher = createDecipheriv(ALGORITHM, deriveKey(), iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

export function generateWebhookSecret(): string {
  return `whsec_${randomBytes(24).toString("base64url")}`;
}

/** HMAC-SHA256 signature over the raw JSON body, hex-encoded — the receiving end recomputes this with the same secret to verify authenticity (docs/outrun/11 "Signature verification"). */
export function signPayload(secret: string, body: string): string {
  return createHmac("sha256", secret).update(body).digest("hex");
}
