import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Outrun — Your AI Growth Partner",
  description:
    "Outrun understands your business, finds your best opportunities, builds your growth strategy and prepares campaigns before you even start working.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
