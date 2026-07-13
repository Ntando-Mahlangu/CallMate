"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

// docs/outrun/04 "Left Sidebar" lists many future sections (Prospects,
// Campaigns, Outreach, Growth Reviews, AI Memory...). Per "FUTURE MODULE
// PLACEHOLDERS — reserve dashboard locations, do not build them now", we
// only list routes that exist today; add entries here as each ships.
const NAV_ITEMS = [
  { href: "/dashboard", label: "Mission Control" },
  { href: "/blueprint", label: "Growth Blueprint" },
  { href: "/prospects", label: "Prospects" },
  { href: "/campaigns", label: "Campaigns" },
  { href: "/seo", label: "SEO" },
  { href: "/ceo-agent", label: "Ask the CEO" },
  { href: "/memory", label: "AI Memory" },
  { href: "/billing", label: "Billing" },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="space-y-1">
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "block rounded-[var(--radius-md)] px-4 py-2 text-sm transition-colors duration-100",
              active
                ? "bg-[var(--color-accent)]/15 text-[var(--color-text-primary)]"
                : "text-[var(--color-text-secondary)] hover:bg-[var(--color-card)] hover:text-[var(--color-text-primary)]",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
