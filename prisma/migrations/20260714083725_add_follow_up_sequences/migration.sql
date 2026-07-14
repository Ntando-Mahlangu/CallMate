-- AlterEnum
ALTER TYPE "EventType" ADD VALUE 'FOLLOW_UP_SEQUENCE_GENERATED';

-- AlterTable
ALTER TABLE "outreach_message" ADD COLUMN     "followUpToId" TEXT,
ADD COLUMN     "scheduledFor" TIMESTAMP(3),
ADD COLUMN     "sequenceStep" INTEGER NOT NULL DEFAULT 0;

-- AddForeignKey
ALTER TABLE "outreach_message" ADD CONSTRAINT "outreach_message_followUpToId_fkey" FOREIGN KEY ("followUpToId") REFERENCES "outreach_message"("id") ON DELETE CASCADE ON UPDATE CASCADE;
