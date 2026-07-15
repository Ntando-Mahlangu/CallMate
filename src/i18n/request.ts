import { getRequestConfig } from "next-intl/server";
import { defaultLocale } from "./locales";

// Only one locale exists today, so there is nothing to negotiate from
// Accept-Language or a locale cookie yet — this always resolves to
// defaultLocale. Once a second entry lands in ./locales.ts, this is where
// per-request negotiation (cookie first, then Accept-Language, falling
// back to defaultLocale) gets added.
export default getRequestConfig(async () => {
  const locale = defaultLocale;
  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default,
  };
});
