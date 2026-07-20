-- CreateEnum
CREATE TYPE "ReviewPeriod" AS ENUM ('WEEKLY', 'MONTHLY', 'QUARTERLY');

-- AlterEnum
ALTER TYPE "EventType" ADD VALUE 'STRATEGIC_REVIEW_GENERATED';

-- CreateTable
CREATE TABLE "strategic_review" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "period" "ReviewPeriod" NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "achievements" JSONB NOT NULL,
    "missedOpportunities" JSONB NOT NULL,
    "risks" JSONB NOT NULL,
    "keyLearnings" JSONB NOT NULL,
    "recommendedPriorities" JSONB NOT NULL,
    "nextGrowthStrategy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "strategic_review_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "strategic_review" ADD CONSTRAINT "strategic_review_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
