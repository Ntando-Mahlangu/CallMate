// docs/outrun/13 "INTERNATIONALIZATION — Prepare architecture for: Multiple
// Languages / Multiple Currencies / Timezones / Localized Formatting. Even
// if English is the initial language." One entry today; adding a locale is
// a matter of appending it here and dropping a matching file in
// ./messages/, not restructuring how any page reads strings.
export const locales = ["en"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";
