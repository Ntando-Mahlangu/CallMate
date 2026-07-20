-- AlterEnum
ALTER TYPE "EventType" ADD VALUE 'LEAD_LIST_CREATED';

-- CreateTable
CREATE TABLE "lead_list" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lead_list_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_list_company" (
    "id" TEXT NOT NULL,
    "leadListId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_list_company_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "lead_list_organizationId_name_key" ON "lead_list"("organizationId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "lead_list_company_leadListId_companyId_key" ON "lead_list_company"("leadListId", "companyId");

-- AddForeignKey
ALTER TABLE "lead_list" ADD CONSTRAINT "lead_list_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_list_company" ADD CONSTRAINT "lead_list_company_leadListId_fkey" FOREIGN KEY ("leadListId") REFERENCES "lead_list"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_list_company" ADD CONSTRAINT "lead_list_company_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
