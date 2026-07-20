import { describe, it, expect } from "vitest";
import { generateApiKey, hashApiKey, looksLikeApiKey } from "./crypto";

describe("generateApiKey", () => {
  it("returns a raw key whose hash matches hashApiKey(rawKey)", () => {
    const { rawKey, hash } = generateApiKey();
    expect(hashApiKey(rawKey)).toBe(hash);
  });

  it("never returns the same raw key twice", () => {
    const a = generateApiKey();
    const b = generateApiKey();
    expect(a.rawKey).not.toBe(b.rawKey);
    expect(a.hash).not.toBe(b.hash);
  });

  it("returns a display prefix that is a real prefix of the raw key, shorter than the full key", () => {
    const { rawKey, displayPrefix } = generateApiKey();
    expect(rawKey.startsWith(displayPrefix)).toBe(true);
    expect(displayPrefix.length).toBeLessThan(rawKey.length);
  });

  it("produces keys recognized by looksLikeApiKey", () => {
    const { rawKey } = generateApiKey();
    expect(looksLikeApiKey(rawKey)).toBe(true);
    expect(looksLikeApiKey("not-a-key")).toBe(false);
  });
});

describe("hashApiKey", () => {
  it("is deterministic for the same input", () => {
    expect(hashApiKey("same-value")).toBe(hashApiKey("same-value"));
  });

  it("differs for different inputs", () => {
    expect(hashApiKey("value-a")).not.toBe(hashApiKey("value-b"));
  });
});
