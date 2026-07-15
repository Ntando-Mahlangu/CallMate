import type { Job, JobType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { captureError } from "@/lib/observability";
import { generateGrowthBlueprint } from "@/lib/growth-blueprint/generate";
import { analyzeSEO } from "@/lib/seo/analyze";
import { createCampaign } from "@/lib/campaigns/create";
import { createTasksFromBlueprint } from "@/lib/tasks/generate-from-blueprint";
import { createNotification, NotificationType } from "@/lib/notifications/create-notification";

export type CampaignGenerationPayload = {
  name: string;
  objective: string;
  companyIds: string[];
  abTest?: boolean;
};

type JobPayloads = {
  BLUEPRINT_GENERATION: Record<string, never>;
  SEO_ANALYSIS: Record<string, never>;
  CAMPAIGN_GENERATION: CampaignGenerationPayload;
};

/**
 * docs/outrun/11-13 "BACKGROUND JOBS" — enqueues a row and returns
 * immediately; the caller is responsible for actually running it (via
 * Next's `after()` in the route handler, right after this call), so the
 * HTTP response doesn't wait on the AI work.
 */
export async function enqueueJob<T extends JobType>(
  organizationId: string,
  type: T,
  payload: JobPayloads[T],
): Promise<Job> {
  return prisma.job.create({
    data: { organizationId, type, payload, status: "PENDING" },
  });
}

async function runHandler(job: Job): Promise<string | null> {
  switch (job.type) {
    case "BLUEPRINT_GENERATION": {
      const blueprint = await generateGrowthBlueprint(job.organizationId);
      await createTasksFromBlueprint(blueprint);
      await createNotification(
        job.organizationId,
        NotificationType.BLUEPRINT_READY,
        "Growth Blueprint ready",
        `Version ${blueprint.version} of your Growth Blueprint has finished generating.`,
        "/blueprint",
      );
      return blueprint.id;
    }
    case "SEO_ANALYSIS": {
      const analysis = await analyzeSEO(job.organizationId);
      await createNotification(
        job.organizationId,
        NotificationType.SEO_ANALYSIS_READY,
        "SEO analysis ready",
        "Your website's SEO analysis has finished.",
        "/seo",
      );
      return analysis.id;
    }
    case "CAMPAIGN_GENERATION": {
      const payload = job.payload as unknown as CampaignGenerationPayload;
      const result = await createCampaign(job.organizationId, payload);
      await createNotification(
        job.organizationId,
        NotificationType.CAMPAIGN_FINISHED,
        "Campaign ready",
        `"${payload.name}" has finished generating.`,
        `/campaigns/${result.campaignId}`,
      );
      return result.campaignId;
    }
  }
}

/**
 * Executes a previously-enqueued job. Safe to call from `after()` (fire
 * and forget — nothing awaits its return value) or from a cron sweep
 * that retries jobs stuck in PENDING (e.g. the invocation that enqueued
 * them crashed before calling this). No-ops if the job has already
 * moved past PENDING, so a job is never run twice.
 */
export async function runJob(jobId: string): Promise<void> {
  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job || job.status !== "PENDING") return;

  await prisma.job.update({
    where: { id: jobId },
    data: { status: "RUNNING", startedAt: new Date() },
  });

  try {
    const resultId = await runHandler(job);
    await prisma.job.update({
      where: { id: jobId },
      data: { status: "SUCCEEDED", completedAt: new Date(), resultId },
    });
  } catch (error) {
    captureError("jobs.run", error, { jobId, type: job.type, organizationId: job.organizationId });
    await prisma.job.update({
      where: { id: jobId },
      data: {
        status: "FAILED",
        completedAt: new Date(),
        errorMessage: error instanceof Error ? error.message : "Something went wrong.",
      },
    });
  }
}

const STUCK_JOB_MINUTES = 10;

/**
 * Entry point for the scheduled sweep (src/app/api/cron/job-queue) —
 * catches jobs that never got picked up by `after()` (e.g. the
 * serverless instance that enqueued them was recycled before the
 * post-response callback ran) and jobs stuck in RUNNING past a
 * reasonable ceiling (the invocation running them died mid-flight).
 */
export async function sweepStuckJobs() {
  const cutoff = new Date(Date.now() - STUCK_JOB_MINUTES * 60 * 1000);

  const stuck = await prisma.job.findMany({
    where: {
      OR: [
        { status: "PENDING", createdAt: { lt: cutoff } },
        { status: "RUNNING", startedAt: { lt: cutoff } },
      ],
    },
  });

  for (const job of stuck) {
    await prisma.job.update({ where: { id: job.id }, data: { status: "PENDING" } });
    await runJob(job.id);
  }

  return { swept: stuck.length };
}
