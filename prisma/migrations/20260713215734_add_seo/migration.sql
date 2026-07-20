-- CreateTable
CREATE TABLE "seo_analysis" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "healthScore" INTEGER NOT NULL,
    "executiveSummary" TEXT NOT NULL,
    "categories" JSONB NOT NULL,
    "quickWins" JSONB NOT NULL,
    "keywordSuggestions" JSONB NOT NULL,
    "contentIdeas" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "seo_analysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seo_content_piece" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "targetKeyword" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "metaDescription" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "seo_content_piece_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "seo_analysis_organizationId_version_key" ON "seo_analysis"("organizationId", "version");

-- AddForeignKey
ALTER TABLE "seo_analysis" ADD CONSTRAINT "seo_analysis_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seo_content_piece" ADD CONSTRAINT "seo_content_piece_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
