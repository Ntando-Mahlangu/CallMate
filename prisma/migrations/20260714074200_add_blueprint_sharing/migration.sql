-- AlterTable
ALTER TABLE "organization" ADD COLUMN     "blueprintShareEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "blueprintShareToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "organization_blueprintShareToken_key" ON "organization"("blueprintShareToken");
