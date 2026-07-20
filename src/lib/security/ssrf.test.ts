import { describe, it, expect } from "vitest";
import { isPrivateAddress, assertPubliclyRoutableUrl } from "./ssrf";

describe("isPrivateAddress", () => {
  it("flags the cloud metadata address as private", () => {
    expect(isPrivateAddress("169.254.169.254", 4)).toBe(true);
  });

  it("flags loopback, RFC1918, and CGNAT ranges as private", () => {
    expect(isPrivateAddress("127.0.0.1", 4)).toBe(true);
    expect(isPrivateAddress("10.0.0.5", 4)).toBe(true);
    expect(isPrivateAddress("172.16.0.1", 4)).toBe(true);
    expect(isPrivateAddress("192.168.1.1", 4)).toBe(true);
    expect(isPrivateAddress("100.64.0.1", 4)).toBe(true);
  });

  it("does not flag ordinary public IPv4 addresses", () => {
    expect(isPrivateAddress("8.8.8.8", 4)).toBe(false);
    expect(isPrivateAddress("1.1.1.1", 4)).toBe(false);
  });

  it("flags IPv6 loopback and link-local addresses", () => {
    expect(isPrivateAddress("::1", 6)).toBe(true);
    expect(isPrivateAddress("fe80::1", 6)).toBe(true);
  });

  it("does not flag an ordinary public IPv6 address", () => {
    expect(isPrivateAddress("2606:4700:4700::1111", 6)).toBe(false);
  });
});

describe("assertPubliclyRoutableUrl", () => {
  it("accepts a normal https URL", () => {
    expect(() => assertPubliclyRoutableUrl("https://example.com/")).not.toThrow();
  });

  it("rejects the literal cloud metadata IP", () => {
    expect(() => assertPubliclyRoutableUrl("http://169.254.169.254/latest/meta-data")).toThrow();
  });

  it("rejects localhost", () => {
    expect(() => assertPubliclyRoutableUrl("http://localhost/")).toThrow();
  });

  it("rejects non-http(s) schemes", () => {
    expect(() => assertPubliclyRoutableUrl("ftp://example.com/")).toThrow();
    expect(() => assertPubliclyRoutableUrl("file:///etc/passwd")).toThrow();
  });

  it("rejects a malformed URL", () => {
    expect(() => assertPubliclyRoutableUrl("not a url")).toThrow();
  });
});
