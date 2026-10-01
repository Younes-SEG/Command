ALTER TABLE "Settings" ADD COLUMN "studyBuddy" TEXT NOT NULL DEFAULT 'CAT';
ALTER TABLE "Settings" ADD COLUMN "buddyMotion" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Settings" ADD CONSTRAINT "Settings_studyBuddy_check" CHECK ("studyBuddy" IN ('CAT', 'SPROUT', 'CLOUD', 'NONE'));
