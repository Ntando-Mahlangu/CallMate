-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('ROLE_CHANGED', 'MEMBER_REMOVED', 'MEMBER_INVITED', 'BILLING_CHANGED', 'DATA_EXPORTED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('BLUEPRINT_READY', 'CAMPAIGN_FINISHED', 'SEO_ANALYSIS_READY', 'STRATEGIC_REVIEW_READY', 'BILLING_EVENT', 'TEAM_MEMBER_JOINED');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('PENDING', 'COMPLETED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "TaskImpact" AS ENUM ('High', 'Medium', 'Low');

-- CreateEnum
CREATE TYPE "GoalStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "ContactVerificationStatus" AS ENUM ('UNVERIFIED', 'VERIFIED', 'BOUNCED');

-- CreateEnum
CREATE TYPE "ContactRelationshipStatus" AS ENUM ('NEW', 'CONTACTED', 'RESPONDED', 'QUALIFIED', 'CUSTOMER', 'LOST');

-- CreateTable
CREATE TABLE "audit_log" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "action" "AuditAction" NOT NULL,
    "targetType" TEXT,
    "targetId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "link" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "impact" "TaskImpact" NOT NULL,
    "effort" TEXT,
    "status" "TaskStatus" NOT NULL DEFAULT 'PENDING',
    "ownerUserId" TEXT,
    "dueDate" TIMESTAMP(3),
    "sourceBlueprintVersion" INTEGER,
    "completionNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goal" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "targetMetric" TEXT,
    "targetValue" DOUBLE PRECISION,
    "currentValue" DOUBLE PRECISION,
    "targetDate" TIMESTAMP(3),
    "status" "GoalStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "goal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "verificationStatus" "ContactVerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "relationshipStatus" "ContactRelationshipStatus" NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contact_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "audit_log_organizationId_createdAt_idx" ON "audit_log"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "notification_organizationId_createdAt_idx" ON "notification"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "task_organizationId_status_createdAt_idx" ON "task"("organizationId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "goal_organizationId_status_idx" ON "goal"("organizationId", "status");

-- CreateIndex
CREATE INDEX "contact_companyId_idx" ON "contact"("companyId");

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification" ADD CONSTRAINT "notification_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task" ADD CONSTRAINT "task_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal" ADD CONSTRAINT "goal_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact" ADD CONSTRAINT "contact_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
