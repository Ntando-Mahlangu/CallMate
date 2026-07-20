import { LegalPage, LegalSection } from "@/components/legal/legal-page";

export default function SecurityPage() {
  return (
    <LegalPage title="Security" updated="July 20, 2026">
      <LegalSection title="Data isolation">
        <p>
          Every workspace is fully isolated. All data access is scoped to
          your account&apos;s membership — there is no code path that reads
          another workspace&apos;s data.
        </p>
      </LegalSection>

      <LegalSection title="Authentication">
        <p>
          Passwords are hashed, never stored in plain text. Sessions are
          managed server-side and can be revoked at any time by signing out.
        </p>
      </LegalSection>

      <LegalSection title="Plan and billing integrity">
        <p>
          Your plan can only ever be changed by a cryptographically verified
          webhook from our payment processor, Paddle — never by a request
          from the browser. We never see or store your card details.
        </p>
      </LegalSection>

      <LegalSection title="Encryption">
        <p>
          Data is encrypted in transit (HTTPS/TLS). Passwords are hashed at
          rest; production deployments should also encrypt the database at
          rest via the hosting provider.
        </p>
      </LegalSection>

      <LegalSection title="Reporting a vulnerability">
        <p>
          If you believe you&apos;ve found a security issue, please contact
          us at outrunv1privacy@outlook.com before disclosing it publicly.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
