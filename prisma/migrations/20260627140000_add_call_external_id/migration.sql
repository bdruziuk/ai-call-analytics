-- AlterTable
ALTER TABLE "Call" ADD COLUMN "externalId" TEXT;

-- CreateIndex
CREATE INDEX "Call_userId_externalId_idx" ON "Call"("userId", "externalId");
