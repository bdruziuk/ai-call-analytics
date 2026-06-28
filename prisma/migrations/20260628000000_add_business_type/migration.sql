-- Add businessType to User (default "other" for all existing accounts)
ALTER TABLE "User" ADD COLUMN "businessType" TEXT NOT NULL DEFAULT 'other';

-- Add industryData to Call (nullable JSON for industry-specific analysis results)
ALTER TABLE "Call" ADD COLUMN "industryData" JSONB;
