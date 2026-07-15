import type { Metadata } from "next";
import { headers } from "next/headers";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import "./globals.css";

export const metadata: Metadata = {
  title: "Outrun — Your AI Growth Partner",
  description:
    "Outrun understands your business, finds your best opportunities, builds your growth strategy and prepares campaigns before you even start working.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // docs/outrun/15 "SECURITY BY DEFAULT" — CSP. Reading the per-request
  // nonce src/proxy.ts generated (rather than statically rendering this
  // layout) is what lets Next.js apply that same nonce to the script tags
  // it injects itself; the nonce would otherwise go stale under caching.
  await headers();
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider messages={messages}>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
