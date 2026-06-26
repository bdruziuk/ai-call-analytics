import pLimit from "p-limit";

// Maximum number of calls being transcribed/analyzed simultaneously.
// Each slot holds one Whisper + one GPT call open against OpenAI.
// Default 5 → safe for OpenAI Tier-1 rate limits while hitting 1000 calls/day.
// Override with PROCESSING_CONCURRENCY env var.
const CONCURRENCY = Math.max(1, parseInt(process.env.PROCESSING_CONCURRENCY ?? "5", 10));

export const processingLimiter = pLimit(CONCURRENCY);
