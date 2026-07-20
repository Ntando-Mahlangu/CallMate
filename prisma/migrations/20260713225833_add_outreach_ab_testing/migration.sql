-- AlterTable
ALTER TABLE "outreach_message" ADD COLUMN     "gotReply" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "variantLabel" TEXT;
