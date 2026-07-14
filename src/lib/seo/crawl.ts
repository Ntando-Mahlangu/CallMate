import * as cheerio from "cheerio";
import { UserFacingError } from "@/lib/errors";
import { assertPubliclyRoutableUrl, ssrfSafeDispatcher } from "@/lib/security/ssrf";

export type WebsiteSignals = {
  url: string;
  title: string | null;
  metaDescription: string | null;
  h1s: string[];
  h2s: string[];
  wordCount: number;
  hasContactInfo: boolean;
  hasForm: boolean;
  linkCount: number;
  imageCount: number;
  imagesMissingAlt: number;
};

/**
 * Real HTTP fetch + HTML parse of the org's website (docs/outrun/09 "AI
 * WEBSITE CRAWL"). Only extracts what can actually be observed from the
 * HTML — never guesses at anything requiring a browser (speed, Core Web
 * Vitals) or an API this app doesn't have (Search Console).
 */
export async function crawlWebsite(url: string): Promise<WebsiteSignals> {
  try {
    assertPubliclyRoutableUrl(url);
  } catch (error) {
    throw new UserFacingError(
      error instanceof Error ? error.message : "That website URL isn't valid.",
    );
  }

  let response: Response;
  try {
    response = await fetch(url, {
      headers: { "User-Agent": "OutrunBot/1.0 (+https://outrun.app)" },
      signal: AbortSignal.timeout(10_000),
      redirect: "follow",
      // @ts-expect-error -- `dispatcher` is undici-specific and not in the
      // standard fetch() types, but Node's global fetch accepts it.
      dispatcher: ssrfSafeDispatcher,
    });
  } catch {
    throw new UserFacingError(
      "We couldn't reach that website. Check the URL and try again.",
    );
  }

  if (!response.ok) {
    throw new UserFacingError(
      `That website returned an error (status ${response.status}). Check the URL and try again.`,
    );
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  const bodyText = $("body").text().replace(/\s+/g, " ").trim();
  const links = $("a[href]");
  const images = $("img");

  const hasContactInfo =
    $('a[href^="mailto:"]').length > 0 ||
    $('a[href^="tel:"]').length > 0 ||
    /contact/i.test(bodyText);

  return {
    url,
    title: $("title").first().text().trim() || null,
    metaDescription: $('meta[name="description"]').attr("content")?.trim() || null,
    h1s: $("h1").map((_, el) => $(el).text().trim()).get().filter(Boolean),
    h2s: $("h2").map((_, el) => $(el).text().trim()).get().filter(Boolean),
    wordCount: bodyText.split(" ").filter(Boolean).length,
    hasContactInfo,
    hasForm: $("form").length > 0,
    linkCount: links.length,
    imageCount: images.length,
    imagesMissingAlt: images.filter((_, el) => !$(el).attr("alt")?.trim()).length,
  };
}
