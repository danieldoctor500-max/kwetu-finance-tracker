CREATE TYPE "IssueReportStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED');

ALTER TABLE "User"
ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE "PlatformCategoryTemplate" (
    "id" UUID NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "type" "TransactionType" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformCategoryTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PlatformSetting" (
    "key" VARCHAR(80) NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformSetting_pkey" PRIMARY KEY ("key")
);

CREATE TABLE "AdminAuditEvent" (
    "id" UUID NOT NULL,
    "actorUserId" UUID,
    "action" VARCHAR(80) NOT NULL,
    "targetUserId" UUID,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminAuditEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "IssueReport" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "subject" VARCHAR(160) NOT NULL,
    "description" VARCHAR(2000) NOT NULL,
    "status" "IssueReportStatus" NOT NULL DEFAULT 'OPEN',
    "adminNote" VARCHAR(1000),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IssueReport_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PlatformCategoryTemplate_name_type_key"
ON "PlatformCategoryTemplate"("name", "type");
CREATE INDEX "PlatformCategoryTemplate_isActive_type_idx"
ON "PlatformCategoryTemplate"("isActive", "type");
CREATE INDEX "AdminAuditEvent_createdAt_idx"
ON "AdminAuditEvent"("createdAt");
CREATE INDEX "AdminAuditEvent_actorUserId_createdAt_idx"
ON "AdminAuditEvent"("actorUserId", "createdAt");
CREATE INDEX "AdminAuditEvent_targetUserId_createdAt_idx"
ON "AdminAuditEvent"("targetUserId", "createdAt");
CREATE INDEX "IssueReport_status_createdAt_idx"
ON "IssueReport"("status", "createdAt");
CREATE INDEX "IssueReport_userId_createdAt_idx"
ON "IssueReport"("userId", "createdAt");

ALTER TABLE "AdminAuditEvent"
ADD CONSTRAINT "AdminAuditEvent_actorUserId_fkey"
FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AdminAuditEvent"
ADD CONSTRAINT "AdminAuditEvent_targetUserId_fkey"
FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "IssueReport"
ADD CONSTRAINT "IssueReport_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "PlatformSetting" ("key", "value", "updatedAt")
VALUES ('maintenanceMode', 'false'::jsonb, CURRENT_TIMESTAMP);

INSERT INTO "PlatformCategoryTemplate" ("id", "name", "type", "updatedAt") VALUES
(gen_random_uuid(), 'Salary', 'INCOME', CURRENT_TIMESTAMP),
(gen_random_uuid(), 'Other income', 'INCOME', CURRENT_TIMESTAMP),
(gen_random_uuid(), 'Food', 'EXPENSE', CURRENT_TIMESTAMP),
(gen_random_uuid(), 'Transport', 'EXPENSE', CURRENT_TIMESTAMP),
(gen_random_uuid(), 'Rent', 'EXPENSE', CURRENT_TIMESTAMP),
(gen_random_uuid(), 'Utilities', 'EXPENSE', CURRENT_TIMESTAMP),
(gen_random_uuid(), 'Health', 'EXPENSE', CURRENT_TIMESTAMP),
(gen_random_uuid(), 'Education', 'EXPENSE', CURRENT_TIMESTAMP),
(gen_random_uuid(), 'Shopping', 'EXPENSE', CURRENT_TIMESTAMP);
