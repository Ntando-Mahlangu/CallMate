import { prisma } from "@/lib/prisma";
import { getAIProvider } from "@/lib/ai";
import { UserFacingError } from "@/lib/errors";
import { logEvent, EventType } from "@/lib/memory/log-event";
import { seoContentSchema, seoContentJsonSchema, type SEOContentData } from "./content-schema";

const SYSTEM_PROMPT = `You are Outrun's AI Content Generator (docs/outrun/09). Write one piece of
original content for a business's website, based on their own business
description and a target keyword.

Rules you must follow (non-negotiable):
- Be original and genuinely helpful — never keyword-stuff or repeat the
  target keyword unnaturally.
- Match the business's own voice implied by its description.
- Never fabricate expertise, credentials, statistics, or customer
  stories the business hasn't told you about.
- body should be 400-700 words of well-structured content (use
  paragraph breaks), ready to paste into a CMS.`;

export async function generateSEOContent(
  organizationId: string,
  input: { headline: string; targetKeyword: string; businessGoal: string },
) {
  const organization = await prisma.organization.findUniqueOrThrow({
    where: { id: organizationId },
    include: { businessProfile: true },
  });
  if (!organization.businessProfile) {
    throw new UserFacingError("Finish Business Discovery before generating content.");
  }

  const ai = getAIProvider();
  const data = await ai.generateObject<SEOContentData>({
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          `Business: ${organization.businessProfile.description}`,
          `Headline to write from: ${input.headline}`,
          `Target keyword: ${input.targetKeyword}`,
          `Business goal for this content: ${input.businessGoal}`,
        ].join("\n"),
      },
    ],
    schema: seoContentSchema,
    jsonSchema: seoContentJsonSchema,
    toolName: "seo_content",
  });

  const piece = await prisma.seoContentPiece.create({
    data: {
      organizationId,
      targetKeyword: input.targetKeyword,
      title: data.title,
      metaDescription: data.metaDescription,
      body: data.body,
    },
  });

  await logEvent(organizationId, EventType.SEO_CONTENT_GENERATED, `Drafted "${data.title}".`);

  return piece;
}
