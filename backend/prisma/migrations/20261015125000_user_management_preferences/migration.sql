ALTER TABLE "User"
ADD COLUMN "phone" VARCHAR(32),
ADD COLUMN "currency" VARCHAR(3) NOT NULL DEFAULT 'KES',
ADD COLUMN "financialPreferences" JSONB NOT NULL DEFAULT '{}'::jsonb,
ADD COLUMN "notificationPreferences" JSONB NOT NULL DEFAULT '{}'::jsonb;
