import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/session";
import { SidebarNav } from "@/components/dashboard/sidebar-nav";
import { SignOutButton } from "@/components/sign-out-button";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getCurrentSession();
  if (!session) redirect("/sign-in");

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)]">
      <header className="flex h-16 items-center justify-between border-b border-[var(--color-border)] px-6">
        <span className="text-lg font-medium tracking-tight text-[var(--color-text-primary)]">
          Outrun
        </span>
        <span className="text-sm text-[var(--color-text-secondary)]">
          {session.user.name}
        </span>
      </header>

      <div className="mx-auto flex max-w-6xl gap-8 px-6 py-8">
        <aside className="hidden w-56 shrink-0 space-y-6 sm:block">
          <SidebarNav />
          <div className="border-t border-[var(--color-border)] pt-4">
            <SignOutButton />
          </div>
        </aside>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
