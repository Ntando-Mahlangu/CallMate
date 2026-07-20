-- AlterEnum
ALTER TYPE "EventType" ADD VALUE 'CALL_SCRIPT_GENERATED';

-- AlterEnum
ALTER TYPE "UsageEventType" ADD VALUE 'CALL_SCRIPT_GENERATION';

-- AlterTable
ALTER TABLE "company" ADD COLUMN     "callScript" JSONB;
