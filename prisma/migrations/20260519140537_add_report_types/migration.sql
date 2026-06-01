-- AlterTable
ALTER TABLE "Call" ADD COLUMN     "detailedReport" JSONB,
ADD COLUMN     "managerMistakes" JSONB,
ADD COLUMN     "objections" JSONB,
ADD COLUMN     "reportType" TEXT NOT NULL DEFAULT 'medium';
