import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { encryptSecret, decryptSecret, generateWebhookSecret, signPayload } from "./crypto";

describe("webhook crypto", () => {
  // deriveKey() reads process.env.BETTER_AUTH_SECRET directly. Next.js
  // auto-loads .env for the real app; plain vitest doesn't, so this needs
  // stubbing here (same pattern as send.test.ts's RESEND_API_KEY).
  beforeAll(() => {
    vi.stubEnv("BETTER_AUTH_SECRET", "test-secret-for-webhook-crypto-only");
  });
  afterAll(() => {
    vi.unstubAllEnvs();
  });

  it("round-trips a secret through encrypt/decrypt", () => {
    const secret = generateWebhookSecret();
    const encrypted = encryptSecret(secret);
    expect(encrypted).not.toContain(secret);
    expect(decryptSecret(encrypted)).toBe(secret);
  });

  it("generates secrets with a recognizable, sufficiently random prefix", () => {
    const a = generateWebhookSecret();
    const b = generateWebhookSecret();
    expect(a.startsWith("whsec_")).toBe(true);
    expect(a).not.toBe(b);
  });

  it("produces a deterministic signature for the same secret and body", () => {
    const secret = "test-secret";
    const body = JSON.stringify({ hello: "world" });
    expect(signPayload(secret, body)).toBe(signPayload(secret, body));
  });

  it("produces a different signature for a different secret or body", () => {
    const body = JSON.stringify({ hello: "world" });
    expect(signPayload("secret-a", body)).not.toBe(signPayload("secret-b", body));
    expect(signPayload("secret-a", body)).not.toBe(
      signPayload("secret-a", JSON.stringify({ hello: "there" })),
    );
  });
});
