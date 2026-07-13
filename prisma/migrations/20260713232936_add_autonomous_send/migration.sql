-- AlterEnum
ALTER TYPE "EventType" ADD VALUE 'AUTONOMOUS_SEND_RUN';

-- AlterTable
ALTER TABLE "campaign" ADD COLUMN     "autonomousDailyLimit" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN     "autonomousSendEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "autonomousSendEnabledAt" TIMESTAMP(3),
ADD COLUMN     "lastAutonomousSendAt" TIMESTAMP(3);
