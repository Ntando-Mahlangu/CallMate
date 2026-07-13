import { LegalPage, LegalSection } from "@/components/legal/legal-page";

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="[Insert launch date]">
      <LegalSection title="What we collect">
        <p>
          Account information you provide directly: your name, business email,
          and password (stored as a hash, never in plain text).
        </p>
        <p>
          Business information you share during onboarding: your business
          description, ideal customer, target markets, growth challenges, and
          goals.
        </p>
        <p>
          Content Outrun generates on your behalf: your Growth Blueprint,
          prospect research, and outreach messages.
        </p>
        <p>
          Billing information, handled entirely by our payment processor,
          Paddle — we never see or store your card details.
        </p>
      </LegalSection>

      <LegalSection title="How we use it">
        <p>
          To provide the product: generating your Growth Blueprint, finding
          and scoring prospects, and writing outreach on your behalf.
        </p>
        <p>To process payments and manage your subscription.</p>
        <p>To send account-related email (verification, password reset, billing).</p>
        <p>We do not sell your data, and we do not use your business data to personalize another customer&apos;s experience.</p>
      </LegalSection>

      <LegalSection title="Who we share it with">
        <p>
          Anthropic processes your business information to generate your
          Growth Blueprint and prospect research.
        </p>
        <p>Google (Places API) is used to search for prospect companies.</p>
        <p>Paddle processes payments and manages billing.</p>
        <p>[Insert email provider] delivers transactional email.</p>
        <p>We do not share your data with anyone else.</p>
      </LegalSection>

      <LegalSection title="Data retention and deletion">
        <p>
          We retain your data for as long as your account is active. You can
          request export or deletion of your data at any time by contacting
          us at [Insert contact email].
        </p>
      </LegalSection>

      <LegalSection title="Contact">
        <p>Questions about this policy: [Insert contact email].</p>
      </LegalSection>
    </LegalPage>
  );
}
