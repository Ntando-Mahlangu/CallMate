-- CreateIndex
CREATE INDEX "campaign_organizationId_idx" ON "campaign"("organizationId");

-- CreateIndex
CREATE INDEX "chat_message_organizationId_createdAt_idx" ON "chat_message"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "event_organizationId_createdAt_idx" ON "event"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "invitation_organizationId_idx" ON "invitation"("organizationId");

-- CreateIndex
CREATE INDEX "lead_list_company_companyId_idx" ON "lead_list_company"("companyId");

-- CreateIndex
CREATE INDEX "membership_organizationId_idx" ON "membership"("organizationId");

-- CreateIndex
CREATE INDEX "outreach_message_companyId_idx" ON "outreach_message"("companyId");

-- CreateIndex
CREATE INDEX "outreach_message_campaignId_idx" ON "outreach_message"("campaignId");

-- CreateIndex
CREATE INDEX "refund_request_organizationId_idx" ON "refund_request"("organizationId");

-- CreateIndex
CREATE INDEX "seo_content_piece_organizationId_idx" ON "seo_content_piece"("organizationId");

-- CreateIndex
CREATE INDEX "strategic_review_organizationId_idx" ON "strategic_review"("organizationId");

-- CreateIndex
CREATE INDEX "usage_event_organizationId_type_createdAt_idx" ON "usage_event"("organizationId", "type", "createdAt");
