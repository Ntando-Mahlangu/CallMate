const SENTRY_DSN = process.env.SENTRY_DSN;

type DsnParts = { publicKey: string; host: string; projectId: string };

function parseDsn(dsn: string): DsnParts | null {
  try {
    const url = new URL(dsn);
    const projectId = url.pathname.replace(/^\//, "");
    if (!url.username || !projectId) return null;
    return { publicKey: url.username, host: url.host, projectId };
  } catch {
    return null;
  }
}

const dsnParts = SENTRY_DSN ? parseDsn(SENTRY_DSN) : null;

/**
 * Every catch block calls this instead of a bare console.error (docs/outrun/15
 * "OBSERVABILITY"). Always emits a structured log line so any host's log
 * aggregation (Vercel, Railway, Fly...) can find it; additionally forwards to
 * Sentry's plain HTTP ingest endpoint when SENTRY_DSN is configured — no SDK
 * dependency, so this degrades to console-only exactly like sendEmail()
 * degrades without RESEND_API_KEY.
 */
export function captureError(scope: string, error: unknown, context?: Record<string, unknown>) {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;

  console.error(
    JSON.stringify({
      level: "error",
      scope,
      message,
      stack,
      context,
      timestamp: new Date().toISOString(),
    }),
  );

  if (dsnParts) {
    sendToSentry(dsnParts, scope, message, stack, context).catch((sendError) => {
      console.error(`[observability] failed to forward error to Sentry: ${sendError}`);
    });
  }
}

async function sendToSentry(
  dsn: DsnParts,
  scope: string,
  message: string,
  stack: string | undefined,
  context: Record<string, unknown> | undefined,
) {
  const eventId = crypto.randomUUID().replace(/-/g, "");
  const event = {
    event_id: eventId,
    timestamp: new Date().toISOString(),
    platform: "node",
    level: "error",
    logger: scope,
    message: { formatted: message },
    exception: stack
      ? {
          values: [
            {
              type: "Error",
              value: message,
              stacktrace: {
                frames: stack
                  .split("\n")
                  .slice(1)
                  .map((line) => ({ function: line.trim() }))
                  .reverse(),
              },
            },
          ],
        }
      : undefined,
    extra: context,
    tags: { scope },
  };

  const header = JSON.stringify({
    event_id: eventId,
    sent_at: new Date().toISOString(),
    dsn: `https://${dsn.publicKey}@${dsn.host}/${dsn.projectId}`,
  });
  const itemHeader = JSON.stringify({ type: "event", content_type: "application/json" });
  const envelope = `${header}\n${itemHeader}\n${JSON.stringify(event)}`;

  await fetch(`https://${dsn.host}/api/${dsn.projectId}/envelope/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-sentry-envelope",
      "X-Sentry-Auth": `Sentry sentry_version=7, sentry_client=outrun/1.0, sentry_key=${dsn.publicKey}`,
    },
    body: envelope,
  });
}

export function isObservabilityConfigured(): boolean {
  return Boolean(dsnParts);
}
