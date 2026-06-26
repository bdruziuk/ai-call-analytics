-- Add retryCount and processingStartedAt to Call
ALTER TABLE "Call" ADD COLUMN "retryCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Call" ADD COLUMN "processingStartedAt" TIMESTAMP(3);

-- Add indexes for status-based queries (critical for 1000 calls/day throughput)
CREATE INDEX "Call_status_idx" ON "Call"("status");
CREATE INDEX "Call_userId_status_createdAt_idx" ON "Call"("userId", "status", "createdAt" DESC);
