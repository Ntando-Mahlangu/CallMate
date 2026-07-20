"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormError } from "@/components/ui/form-error";

// docs/outrun/15 "AUTHENTICATION SECURITY — Optional MFA". Rendered by the
// sign-in page in place of the password form once signIn.email/social
// reports `twoFactorRedirect: true` — the two-factor cookie Better Auth set
// on that response is what verifyTotp/verifyBackupCode below authenticate
// against, so this never needs the user's password again.
export function TwoFactorChallenge({ onVerified }: { onVerified: () => void }) {
  const [code, setCode] = useState("");
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [trustDevice, setTrustDevice] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const { error: verifyError } = useBackupCode
      ? await authClient.twoFactor.verifyBackupCode({ code, trustDevice })
      : await authClient.twoFactor.verifyTotp({ code, trustDevice });

    setIsSubmitting(false);

    if (verifyError) {
      setError(
        verifyError.message ??
          "That code didn't work. Check your authenticator app and try again.",
      );
      return;
    }

    onVerified();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormError message={error} />

      <div className="space-y-2">
        <Label htmlFor="totp-code">{useBackupCode ? "Backup code" : "6-digit code"}</Label>
        <Input
          id="totp-code"
          inputMode={useBackupCode ? "text" : "numeric"}
          autoComplete="one-time-code"
          autoFocus
          required
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder={useBackupCode ? "xxxxx-xxxxx" : "123456"}
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
        <input
          type="checkbox"
          checked={trustDevice}
          onChange={(e) => setTrustDevice(e.target.checked)}
          className="size-4 rounded border-[var(--color-border)] bg-[var(--color-bg-secondary)]"
        />
        Trust this device for 30 days
      </label>

      <Button type="submit" className="w-full" disabled={isSubmitting || !code}>
        {isSubmitting ? "Verifying…" : "Verify"}
      </Button>

      <button
        type="button"
        onClick={() => {
          setUseBackupCode((v) => !v);
          setCode("");
          setError(null);
        }}
        className="w-full text-center text-xs text-[var(--color-text-muted)] hover:text-[var(--color-accent-text)]"
      >
        {useBackupCode ? "Use your authenticator app instead" : "Use a backup code instead"}
      </button>
    </form>
  );
}
