-- CreateEnum
CREATE TYPE "CampaignTemplateCategory" AS ENUM ('COLD_OUTREACH', 'REFERRAL_REQUESTS', 'PARTNERSHIPS', 'WEBSITE_AUDITS', 'CONSULTATION_OFFERS', 'PRODUCT_LAUNCHES');

-- AlterEnum
ALTER TYPE "EventType" ADD VALUE 'CAMPAIGN_TEMPLATE_SAVED';

-- CreateTable
CREATE TABLE "campaign_template" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "CampaignTemplateCategory" NOT NULL,
    "objective" TEXT NOT NULL,
    "abTest" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaign_template_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "campaign_template" ADD CONSTRAINT "campaign_template_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
