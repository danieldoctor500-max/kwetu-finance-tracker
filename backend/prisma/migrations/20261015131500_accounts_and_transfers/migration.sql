CREATE TYPE "FinancialAccountType" AS ENUM ('CASH', 'BANK', 'MOBILE_MONEY', 'OTHER');

CREATE TABLE "FinancialAccount" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "type" "FinancialAccountType" NOT NULL,
    "provider" VARCHAR(80),
    "openingBalance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'KES',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinancialAccount_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Transfer" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "fromAccountId" UUID NOT NULL,
    "toAccountId" UUID NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "description" VARCHAR(240),
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transfer_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Transaction" ADD COLUMN "accountId" UUID;

CREATE UNIQUE INDEX "FinancialAccount_userId_name_key" ON "FinancialAccount"("userId", "name");
CREATE INDEX "FinancialAccount_userId_type_idx" ON "FinancialAccount"("userId", "type");
CREATE INDEX "Transfer_userId_occurredAt_idx" ON "Transfer"("userId", "occurredAt");
CREATE INDEX "Transfer_fromAccountId_occurredAt_idx" ON "Transfer"("fromAccountId", "occurredAt");
CREATE INDEX "Transfer_toAccountId_occurredAt_idx" ON "Transfer"("toAccountId", "occurredAt");
CREATE INDEX "Transaction_accountId_occurredAt_idx" ON "Transaction"("accountId", "occurredAt");

ALTER TABLE "FinancialAccount" ADD CONSTRAINT "FinancialAccount_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_fromAccountId_fkey"
FOREIGN KEY ("fromAccountId") REFERENCES "FinancialAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_toAccountId_fkey"
FOREIGN KEY ("toAccountId") REFERENCES "FinancialAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_accountId_fkey"
FOREIGN KEY ("accountId") REFERENCES "FinancialAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
