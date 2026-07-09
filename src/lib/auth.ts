import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";

const googleConfigured = Boolean(
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
);

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",

  emailAndPassword: {
    enabled: true,
    // Flip to true once RESEND_API_KEY is set — see docs/outrun/03.
    requireEmailVerification: false,
    sendResetPassword: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: "Reset your Outrun password",
        text: `Reset your password: ${url}\n\nIf you didn't request this, you can ignore this email.`,
      });
    },
  },

  emailVerification: {
    sendOnSignUp: true,
    sendVerificationEmail: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: "Verify your Outrun account",
        text: `Confirm your email to finish setting up Outrun: ${url}`,
      });
    },
  },

  socialProviders: googleConfigured
    ? {
        google: {
          clientId: process.env.GOOGLE_CLIENT_ID!,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        },
      }
    : undefined,

  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24, // refresh once per day of activity
  },

  databaseHooks: {
    user: {
      create: {
        // Every account owns exactly one Organization from the moment it
        // exists — business details (industry, ICP, goals...) get filled
        // in by the Business Discovery onboarding flow, not here.
        after: async (user) => {
          await prisma.organization.create({
            data: {
              name: `${user.name}'s Workspace`,
              memberships: {
                create: { userId: user.id, role: "OWNER" },
              },
            },
          });
        },
      },
    },
  },
});

export const isGoogleAuthEnabled = googleConfigured;
