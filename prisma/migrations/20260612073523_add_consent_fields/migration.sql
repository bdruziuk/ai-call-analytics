-- AlterTable
ALTER TABLE "User" ADD COLUMN     "analyticsConsentAccepted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "analyticsConsentAcceptedAt" TIMESTAMP(3),
ADD COLUMN     "analyticsConsentVersion" TEXT,
ADD COLUMN     "marketingDemoConsentAccepted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "marketingDemoConsentAcceptedAt" TIMESTAMP(3),
ADD COLUMN     "marketingDemoConsentVersion" TEXT;
