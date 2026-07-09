import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { SignOutButton } from "@/components/sign-out-button";

export default async function WelcomePage() {
  const session = await getCurrentSession();
  if (!session) redirect("/sign-in");

  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id },
    include: { organization: true },
    orderBy: { createdAt: "asc" },
  });

  const firstName = session.user.name.split(" ")[0];

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--color-bg-primary)] px-4 py-16">
      <Card className="w-full max-w-lg animate-fade-in">
        <CardHeader>
          <CardTitle>Welcome, {firstName}.</CardTitle>
          <CardDescription>
            Today we&apos;re going to learn about your business and build your
            first AI Growth Blueprint. This usually takes less than five
            minutes.
          </CardDescription>
        </CardHeader>

        <div className="space-y-4">
          <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
              Workspace
            </p>
            <p className="text-sm text-[var(--color-text-primary)]">
              {membership?.organization.name ?? "Your workspace"}
            </p>
          </div>

          <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
              Next up
            </p>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Business Discovery — the conversational onboarding that builds
              your Growth Blueprint — ships in the next build phase.
            </p>
          </div>

          <SignOutButton />
        </div>
      </Card>
    </main>
  );
}
