import { prisma } from "@/lib/prisma";
import { getAIProvider } from "@/lib/ai";
import { UserFacingError } from "@/lib/errors";
import { logEvent, EventType } from "@/lib/memory/log-event";
import {
  companyResearchSchema,
  companyResearchJsonSchema,
  type CompanyResearchData,
} from "./research-schema";

const SYSTEM_PROMPT = `You are Outrun's AI Company Research engine (docs/outrun/06). You are
researching one specific prospect for the business that is using Outrun.

Rules you must follow (non-negotiable):
- Only use the facts given to you: the prospect's name, category, address,
  website presence, rating, and review count, plus the requesting
  business's own profile and ideal customer profile. Never invent facts
  you were not given — no funding history, no employee counts, no news,
  no named individuals.
- If no website was provided, say so explicitly in websiteObservations
  (set it to a short note that no website was found — never invent one).
- Tag every item in likelyPainPoints as "observed" only if it follows
  directly from a given fact (e.g. no website found); everything else is
  "assumption" — an informed guess based on the category and general
  industry patterns, and must be labeled as such.
- suggestedDecisionMakerTitle is a role/title guess appropriate for a
  business of this type — never a person's name.
- Be concise, specific to this business, and never generic filler that
  could describe any company in the category.`;

function buildUserMessage(input: {
  companyName: string;
  category: string | null;
  formattedAddress: string | null;
  website: string | null;
  rating: number | null;
  reviewCount: number | null;
  requestingBusinessDescription: string;
  idealCustomer: string;
}) {
  return [
    `Prospect name: ${input.companyName}`,
    `Category: ${input.category ?? "unknown"}`,
    `Address: ${input.formattedAddress ?? "unknown"}`,
    `Website: ${input.website ?? "none found"}`,
    `Rating: ${input.rating != null ? `${input.rating}/5` : "unknown"}`,
    `Review count: ${input.reviewCount ?? "unknown"}`,
    "",
    `The requesting business does this: ${input.requestingBusinessDescription}`,
    `Its ideal customer: ${input.idealCustomer}`,
    "",
    "Produce a complete research profile for this one prospect.",
  ].join("\n");
}

export async function researchCompany(companyId: string, organizationId: string) {
  const company = await prisma.company.findFirst({
    where: { id: companyId, organizationId },
  });
  if (!company) {
    throw new UserFacingError("That prospect could not be found.");
  }

  const businessProfile = await prisma.businessProfile.findUnique({
    where: { organizationId },
  });
  if (!businessProfile) {
    throw new UserFacingError(
      "Finish Business Discovery before researching prospects.",
    );
  }

  const ai = getAIProvider();
  const data = await ai.generateObject<CompanyResearchData>({
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: buildUserMessage({
          companyName: company.name,
          category: company.category,
          formattedAddress: company.formattedAddress,
          website: company.website,
          rating: company.rating,
          reviewCount: company.reviewCount,
          requestingBusinessDescription: businessProfile.description,
          idealCustomer: businessProfile.idealCustomer,
        }),
      },
    ],
    schema: companyResearchSchema,
    jsonSchema: companyResearchJsonSchema,
    toolName: "company_research",
  });

  const updated = await prisma.company.update({
    where: { id: company.id },
    data: { research: data },
  });

  await logEvent(
    organizationId,
    EventType.COMPANY_RESEARCHED,
    `Researched ${company.name}.`,
  );

  return updated;
}
