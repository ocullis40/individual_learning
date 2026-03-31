-- Backfill null education levels
UPDATE "lessons" SET "education_level" = 'college' WHERE "education_level" IS NULL;

-- AlterTable
ALTER TABLE "lessons" ALTER COLUMN "education_level" SET NOT NULL;
