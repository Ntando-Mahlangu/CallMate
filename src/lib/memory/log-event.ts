import { EventType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { captureError } from "@/lib/observability";
import { dispatchEvent } from "@/lib/webhooks/dispatch";

/**
 * Writes one row to the Business Brain's growth timeline. Never throws —
 * a logging failure should never break the action it's describing.
 *
 * Also the single entry point for outgoing webhooks (docs/outrun/11
 * "EVENT SYSTEM" / "WEBHOOK SYSTEM"): every call site already logging a
 * business event gets webhook delivery for free, rather than each one
 * needing to remember to call dispatchEvent() itself. dispatchEvent()
 * never throws either, so this never risks failing the caller.
 */
export async function logEvent(organizationId: string, type: EventType, summary: string) {
  try {
    await prisma.event.create({ data: { organizationId, type, summary } });
  } catch (error) {
    captureError("memory.log-event", error, { organizationId, type });
  }
  await dispatchEvent(organizationId, type, { summary });
}

export { EventType };
