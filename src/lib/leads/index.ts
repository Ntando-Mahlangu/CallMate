import type { CompanyDataProvider } from "./types";
import { GooglePlacesProvider } from "./google-places-provider";

export type { CompanyDataProvider, RawCompanyResult } from "./types";

let provider: CompanyDataProvider | null = null;

/** Same swap pattern as src/lib/ai/index.ts — one place decides the provider. */
export function getCompanyDataProvider(): CompanyDataProvider {
  if (provider) return provider;

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GOOGLE_PLACES_API_KEY is not set. Add it to .env to enable company search.",
    );
  }

  provider = new GooglePlacesProvider(apiKey);
  return provider;
}

export function isCompanySearchConfigured(): boolean {
  return Boolean(process.env.GOOGLE_PLACES_API_KEY);
}
