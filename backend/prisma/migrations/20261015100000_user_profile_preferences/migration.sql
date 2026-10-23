-- Add account profile and appearance settings without modifying existing finance records.
CREATE TYPE "ThemePreference" AS ENUM ('LIGHT', 'DARK');

ALTER TABLE "User"
ADD COLUMN "profilePhoto" TEXT,
ADD COLUMN "themePreference" "ThemePreference" NOT NULL DEFAULT 'LIGHT';
