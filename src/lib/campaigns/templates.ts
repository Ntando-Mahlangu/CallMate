import type { CampaignTemplateCategory } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { UserFacingError } from "@/lib/errors";
import { logEvent, EventType } from "@/lib/memory/log-event";

const MAX_NAME_LENGTH = 80;

export async function getTemplatesForOrg(organizationId: string) {
  return prisma.campaignTemplate.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
  });
}

export async function createTemplate(
  organizationId: string,
  input: { name: string; category: CampaignTemplateCategory; objective: string; abTest: boolean },
) {
  const name = input.name.trim();
  const objective = input.objective.trim();
  if (!name) throw new UserFacingError("Give the template a name.");
  if (name.length > MAX_NAME_LENGTH) {
    throw new UserFacingError(`Template names must be ${MAX_NAME_LENGTH} characters or fewer.`);
  }
  if (!objective) throw new UserFacingError("Give the template an objective.");

  const template = await prisma.campaignTemplate.create({
    data: { organizationId, name, category: input.category, objective, abTest: input.abTest },
  });

  await logEvent(organizationId, EventType.CAMPAIGN_TEMPLATE_SAVED, `Saved campaign template "${name}".`);

  return template;
}

export async function updateTemplate(
  organizationId: string,
  templateId: string,
  input: { name: string; category: CampaignTemplateCategory; objective: string; abTest: boolean },
) {
  const template = await prisma.campaignTemplate.findFirst({
    where: { id: templateId, organizationId },
  });
  if (!template) throw new UserFacingError("That template could not be found.");

  const name = input.name.trim();
  const objective = input.objective.trim();
  if (!name) throw new UserFacingError("Give the template a name.");
  if (name.length > MAX_NAME_LENGTH) {
    throw new UserFacingError(`Template names must be ${MAX_NAME_LENGTH} characters or fewer.`);
  }
  if (!objective) throw new UserFacingError("Give the template an objective.");

  return prisma.campaignTemplate.update({
    where: { id: templateId },
    data: { name, category: input.category, objective, abTest: input.abTest },
  });
}

export async function deleteTemplate(organizationId: string, templateId: string) {
  const template = await prisma.campaignTemplate.findFirst({
    where: { id: templateId, organizationId },
  });
  if (!template) throw new UserFacingError("That template could not be found.");

  await prisma.campaignTemplate.delete({ where: { id: templateId } });
}
