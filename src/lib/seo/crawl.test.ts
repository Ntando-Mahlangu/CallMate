import { describe, it, expect } from "vitest";
import { parseWebsiteSignals } from "./crawl";

describe("parseWebsiteSignals", () => {
  it("detects a Google Maps embed and a street address when present", () => {
    const html = `<!doctype html>
      <html>
      <head><title>Test Plumbing Co</title><meta name="description" content="Test"></head>
      <body>
        <h1>Test Plumbing Co</h1>
        <p>Located at 123 Main Street, Suite 4, we serve Austin and the surrounding area.</p>
        <iframe src="https://www.google.com/maps/embed?pb=abc123"></iframe>
        <a href="tel:5551234567">Call us</a>
        <form><input type="text" /></form>
      </body>
      </html>`;

    const signals = parseWebsiteSignals("https://example.com", html);

    expect(signals.hasGoogleMapsEmbed).toBe(true);
    expect(signals.hasStreetAddressPattern).toBe(true);
    expect(signals.bodyTextLower).toContain("austin");
    expect(signals.hasContactInfo).toBe(true);
    expect(signals.hasForm).toBe(true);
  });

  it("reports both signals as false when neither is present", () => {
    const html = `<!doctype html>
      <html>
      <head><title>No Signals Co</title></head>
      <body>
        <h1>No Signals Co</h1>
        <p>We do things. Contact us for more information.</p>
      </body>
      </html>`;

    const signals = parseWebsiteSignals("https://example.com", html);

    expect(signals.hasGoogleMapsEmbed).toBe(false);
    expect(signals.hasStreetAddressPattern).toBe(false);
  });
});
