export type JobStatusResponse = {
  id: string;
  type: string;
  status: "PENDING" | "RUNNING" | "SUCCEEDED" | "FAILED";
  resultId: string | null;
  errorMessage: string | null;
};

const DEFAULT_INTERVAL_MS = 2000;
const DEFAULT_TIMEOUT_MS = 120_000;

/**
 * Client-side helper: polls GET /api/jobs/[id] until it reaches a
 * terminal state. Used by every page that enqueues a background job
 * (Blueprint generation, SEO analysis, campaign generation) instead of
 * each one hand-rolling its own polling loop.
 */
export async function pollJob(
  jobId: string,
  options: { intervalMs?: number; timeoutMs?: number } = {},
): Promise<JobStatusResponse> {
  const intervalMs = options.intervalMs ?? DEFAULT_INTERVAL_MS;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const res = await fetch(`/api/jobs/${jobId}`);
    const body = await res.json();
    if (!res.ok) throw new Error(body.error ?? "Something went wrong.");

    const job = body.job as JobStatusResponse;
    if (job.status === "SUCCEEDED" || job.status === "FAILED") {
      return job;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error("This is taking longer than expected. Please check back in a moment.");
}
