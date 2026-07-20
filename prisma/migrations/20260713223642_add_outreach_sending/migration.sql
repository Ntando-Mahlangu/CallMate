-- CreateEnum
CREATE TYPE "SendStatus" AS ENUM ('NOT_SENT', 'SENT', 'FAILED');

-- AlterEnum
ALTER TYPE "EventType" ADD VALUE 'OUTREACH_SENT';

-- AlterTable
ALTER TABLE "company" ADD COLUMN     "contactEmail" TEXT;

-- AlterTable
ALTER TABLE "outreach_message" ADD COLUMN     "sendStatus" "SendStatus" NOT NULL DEFAULT 'NOT_SENT',
ADD COLUMN     "sentAt" TIMESTAMP(3);
