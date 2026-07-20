-- AlterTable
ALTER TABLE "campaign" ADD COLUMN     "audienceSource" TEXT,
ADD COLUMN     "strategyChannel" TEXT,
ADD COLUMN     "strategyStrengths" JSONB,
ADD COLUMN     "strategyWeaknesses" JSONB;

-- AlterTable
ALTER TABLE "outreach_message" ADD COLUMN     "linkedinMessage" TEXT;
