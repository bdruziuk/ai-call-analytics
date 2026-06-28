-- Clear scores from existing junk calls so they don't pollute score statistics.
-- New junk calls already get score=null from analyzeCall.ts.
UPDATE "Call" SET score = NULL WHERE "saleStatus" = 'junk' AND score IS NOT NULL;
