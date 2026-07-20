-- AlterTable
-- businessSnapshot is backfilled with an empty object for any pre-existing
-- rows (they genuinely have no snapshot data — this isn't fabricating a
-- value, just marking the gap honestly) then the default is dropped so
-- every new row must supply a real one.
ALTER TABLE "growth_blueprint" ADD COLUMN     "businessSnapshot" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "websiteAnalysis" JSONB;

ALTER TABLE "growth_blueprint" ALTER COLUMN "businessSnapshot" DROP DEFAULT;
