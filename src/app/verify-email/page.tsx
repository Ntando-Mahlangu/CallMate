"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FormError } from "@/components/ui/form-error";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const { data: session } = authClient.useSession();
  const email = session?.user.email ?? searchParams.get("email") ?? "";

  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleResend() {
    setError(null);
    setStatus("sending");

    const { error: resendError } = await authClient.sendVerificationEmail({
      email,
      callbackURL: "/welcome",
    });

    if (resendError) {
      setError(resendError.message ?? "We couldn't resend that email. Please try again.");
      setStatus("idle");
      return;
    }
    setStatus("sent");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--color-bg-primary)] px-4 py-16">
      <Card className="w-full max-w-md animate-fade-in text-center">
        <CardHeader>
          <CardTitle>Confirm your email.</CardTitle>
          <CardDescription>
            {email ? (
              <>
                We sent a confirmation link to{" "}
                <span className="text-[var(--color-text-primary)]">{email}</span>. Click it to
                finish setting up Outrun.
              </>
            ) : (
              "Check your inbox for a confirmation link to finish setting up Outrun."
            )}
          </CardDescription>
        </CardHeader>

        <FormError message={error} />

        {status === "sent" ? (
          <p className="text-sm text-[var(--color-text-secondary)]">
            Sent again — check your inbox.
          </p>
        ) : (
          <Button
            variant="secondary"
            className="w-full"
            disabled={status === "sending" || !email}
            onClick={handleResend}
          >
            {status === "sending" ? "Sending…" : "Resend confirmation email"}
          </Button>
        )}

        <p className="mt-8 text-sm text-[var(--color-text-secondary)]">
          Wrong account?{" "}
          <Link href="/sign-in" className="text-[var(--color-accent)] hover:underline">
            Sign in
          </Link>
        </p>
      </Card>
    </main>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailContent />
    </Suspense>
  );
}
