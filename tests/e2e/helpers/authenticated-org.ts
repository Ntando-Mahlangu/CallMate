import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Creates a real, signed-in organization for E2E tests that need an
 * authenticated session — bypasses the email-verification step directly
 * via Prisma (same pattern as manual a11y verification during
 * development) since there's no way to click a verification link in CI.
 * Seeds just enough real data for the authenticated pages to render
 * fully rather than showing every empty state.
 */
export async function createAuthenticatedOrg(baseURL: string) {
  const email = `e2e-a11y-${crypto.randomUUID()}@example.com`;
  const password = "correct-horse-battery-staple";

  const signUpRes = await fetch(`${baseURL}/api/auth/sign-up/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: baseURL },
    body: JSON.stringify({ email, password, name: "A11y E2E" }),
  });
  if (!signUpRes.ok) throw new Error(`sign-up failed: ${signUpRes.status} ${await signUpRes.text()}`);

  const user = await prisma.user.findUniqueOrThrow({ where: { email } });
  await prisma.user.update({ where: { id: user.id }, data: { emailVerified: true } });

  const signInRes = await fetch(`${baseURL}/api/auth/sign-in/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: baseURL },
    body: JSON.stringify({ email, password }),
  });
  if (!signInRes.ok) throw new Error(`sign-in failed: ${signInRes.status} ${await signInRes.text()}`);
  const setCookie = signInRes.headers.getSetCookie().find((c) => c.includes("session_token"));
  if (!setCookie) throw new Error("no session cookie in sign-in response");
  const [cookieName, cookieValueRaw] = setCookie.split(";")[0]!.split("=");
  const cookie = { name: cookieName!, value: decodeURIComponent(cookieValueRaw!) };

  const membership = await prisma.membership.findFirstOrThrow({ where: { userId: user.id } });
  const organizationId = membership.organizationId;

  await prisma.businessProfile.create({
    data: {
      organizationId,
      description: "A B2B accounting software company serving small law firms.",
      idealCustomer: "Independent law firms with 5-30 employees.",
      sellingLocations: ["United States"],
      acquisitionChannels: ["Referrals"],
      growthChallenge: "Low outbound reply rates.",
      mainGoal: "Book more discovery calls.",
      competitors: ["Clio"],
    },
  });

  const company = await prisma.company.create({
    data: {
      organizationId,
      source: "e2e",
      sourceId: "e2e-1",
      name: "E2E Law Firm",
      category: "Law Firm",
      fitScore: 85,
      fitReason: "Fit reasoning.",
      confidenceScore: 80,
      confidenceReason: "Confidence reasoning.",
      research: {
        companySummary: "A growing law firm.",
        likelyPainPoints: [{ point: "Manual invoicing", basis: "No accounting software found" }],
        whyTheyMatch: ["Matches ICP"],
        growthOpportunities: ["Automate billing"],
        recommendedContactAngle: "Lead with time saved",
        suggestedDecisionMakerTitle: "Managing Partner",
      },
    },
  });

  await prisma.task.create({
    data: { organizationId, title: "Set up nurture sequence", description: "d", impact: "Medium", status: "PENDING" },
  });
  await prisma.goal.create({
    data: { organizationId, title: "Book 10 calls", status: "ACTIVE" },
  });

  return { organizationId, cookie, companyId: company.id };
}

export async function deleteOrg(organizationId: string) {
  await prisma.organization.delete({ where: { id: organizationId } });
}

export { prisma };
