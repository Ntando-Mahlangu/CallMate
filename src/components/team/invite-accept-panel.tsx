"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";

export function InviteAcceptPanel({
  token,
  invitedEmail,
  sessionEmail,
}: {
  token: string;
  invitedEmail: string;
  sessionEmail: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isAccepting, setIsAccepting] = useState(false);
  const emailMismatch = invitedEmail.toLowerCase() !== sessionEmail.toLowerCase();

  async function handleAccept() {
    setError(null);
    setIsAccepting(true);
    try {
      const res = await fetch("/api/team/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Something went wrong.");
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setIsAccepting(false);
    }
  }

  if (emailMismatch) {
    return (
      <p className="text-sm text-[var(--color-text-secondary)]">
        This invitation was sent to {invitedEmail}, but you&apos;re signed in as {sessionEmail}.
        Sign in with {invitedEmail} to accept it.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <FormError message={error} />
      <Button onClick={handleAccept} disabled={isAccepting} className="w-full">
        {isAccepting ? "Joining…" : "Accept invitation"}
      </Button>
    </div>
  );
}
