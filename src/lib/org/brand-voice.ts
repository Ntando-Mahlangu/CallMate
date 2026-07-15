import { prisma } from "@/lib/prisma";
import { UserFacingError } from "@/lib/errors";

// docs/outrun/07 STEP 4 "BRAND VOICE" — the exact fixed list from the
// spec. Stored in Organization.brandVoice (already read by outreach.ts,
// campaign strategy, and call-script generation) but never settable to
// an arbitrary string, so every AI prompt that reads it gets one of a
// known, tested set of tones.
export const BRAND_VOICE_OPTIONS = [
  "Professional",
  "Friendly",
  "Consultative",
  "Confident",
  "Direct",
  "Luxury",
  "Technical",
  "Educational",
] as const;

export type BrandVoice = (typeof BRAND_VOICE_OPTIONS)[number];

export function isBrandVoice(value: unknown): value is BrandVoice {
  return typeof value === "string" && (BRAND_VOICE_OPTIONS as readonly string[]).includes(value);
}

export async function setBrandVoice(organizationId: string, voice: BrandVoice) {
  if (!isBrandVoice(voice)) {
    throw new UserFacingError("Choose one of the listed brand voices.");
  }
  return prisma.organization.update({
    where: { id: organizationId },
    data: { brandVoice: voice },
  });
}
