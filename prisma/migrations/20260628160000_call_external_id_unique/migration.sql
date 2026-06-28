-- Remove duplicate calls sharing the same (userId, externalId).
-- Keep the one with the best status (completed > analyzing > transcribing > queued > other),
-- breaking ties by earliest createdAt.
WITH ranked AS (
  SELECT id,
    ROW_NUMBER() OVER (
      PARTITION BY "userId", "externalId"
      ORDER BY
        CASE status
          WHEN 'completed'    THEN 0
          WHEN 'analyzing'    THEN 1
          WHEN 'transcribing' THEN 2
          WHEN 'queued'       THEN 3
          ELSE 4
        END ASC,
        "createdAt" ASC
    ) AS rn
  FROM "Call"
  WHERE "externalId" IS NOT NULL AND "userId" IS NOT NULL
)
DELETE FROM "Call" WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- Drop the old non-unique index (replaced by the constraint below)
DROP INDEX IF EXISTS "Call_userId_externalId_idx";

-- Add unique constraint.
-- PostgreSQL treats NULL as distinct, so calls without externalId are unaffected.
ALTER TABLE "Call" ADD CONSTRAINT "Call_userId_externalId_key" UNIQUE ("userId", "externalId");
