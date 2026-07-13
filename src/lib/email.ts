const FROM = process.env.EMAIL_FROM ?? "Outrun <noreply@outrun.app>";
const RESEND_API_KEY = process.env.RESEND_API_KEY;

type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
};

/**
 * Single outbound-email seam so the provider can be swapped without
 * touching call sites (Article X). Falls back to logging in development
 * so auth flows are fully exercisable before a Resend key exists.
 */
export async function sendEmail({ to, subject, text }: SendEmailInput) {
  if (!RESEND_API_KEY) {
    console.log(
      `[dev email] to=${to} subject="${subject}"\n${text}\n`,
    );
    return;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM, to, subject, text }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Failed to send email: ${response.status} ${body}`);
  }
}

/**
 * Auth emails silently no-op to a console log without RESEND_API_KEY —
 * fine for internal transactional mail during development. Outbound
 * prospect outreach is different: it goes to a third party, so callers
 * that send *to a prospect* (docs/outrun/07) check this first and tell
 * the user honestly rather than claiming a send that never left the
 * server.
 */
export function isEmailSendingConfigured(): boolean {
  return Boolean(RESEND_API_KEY);
}
