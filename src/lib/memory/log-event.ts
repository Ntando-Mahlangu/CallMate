import { EventType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Writes one row to the Business Brain's growth timeline. Never throws —
 * a logging failure should never break the action it's describing.
 */
export async function logEvent(organizationId: string, type: EventType, summary: string) {
  try {
    await prisma.event.create({ data: { organizationId, type, summary } });
  } catch (error) {
    console.error("Failed to log event:", error);
  }
}

export { EventType };
