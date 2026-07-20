import type { Locale } from "@/i18n/locales";
import { defaultLocale } from "@/i18n/locales";

// docs/outrun/13 "INTERNATIONALIZATION — ... Multiple Currencies /
// Timezones / Localized Formatting." Every call site passes its locale
// explicitly rather than this reaching for a request-scoped default, so a
// server-rendered value can never mismatch what the client re-renders with
// once a second locale exists — the classic App Router i18n hydration trap.
export function formatDate(
  date: Date | string,
  locale: Locale = defaultLocale,
  options: Intl.DateTimeFormatOptions = { dateStyle: "medium", timeStyle: "short" },
): string {
  const value = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, options).format(value);
}

export function formatCurrency(
  amount: number,
  currency = "USD",
  locale: Locale = defaultLocale,
): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(amount);
}
