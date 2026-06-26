import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { db } from "@/lib/db";
import { enqueueCall } from "@/services/call.service";

function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const list = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.toLowerCase());
}

// Calls stuck in transcribing/analyzing longer than this are considered hung.
const STUCK_THRESHOLD_MS = parseInt(
  process.env.STUCK_CALL_THRESHOLD_MS ?? String(20 * 60 * 1000),
  10,
);

const MAX_RETRY_COUNT = 3;

/**
 * POST /api/worker/recover — admin-only
 *
 * 1. Resets calls stuck in transcribing/analyzing for > STUCK_THRESHOLD_MS back to "queued".
 * 2. Re-enqueues "queued" calls that haven't started yet (e.g. after a server restart).
 * 3. Skips calls that have already exceeded MAX_RETRY_COUNT.
 *
 * Safe to call repeatedly (idempotent). Intended to be triggered by a cron job
 * (Railway Cron Service → POST /api/worker/recover every 10–15 minutes)
 * with the CRON_SECRET header for authentication in production.
 */
export async function POST(request: Request) {
  // Accept either admin session OR a shared secret for cron invocations.
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("x-cron-secret");
  const isCron = cronSecret && authHeader === cronSecret;

  if (!isCron) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email || !isAdminEmail(session.user.email)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const stuckSince = new Date(Date.now() - STUCK_THRESHOLD_MS);

  // 1. Reset hung in-flight calls
  const resetResult = await db.call.updateMany({
    where: {
      status:    { in: ["transcribing", "analyzing"] },
      processingStartedAt: { lt: stuckSince },
      retryCount: { lt: MAX_RETRY_COUNT },
    },
    data: {
      status:     "queued",
      retryCount: { increment: 1 },
      processingStartedAt: null,
    },
  });

  // 2. Mark permanently failed calls that have exceeded max retries
  const abandonResult = await db.call.updateMany({
    where: {
      status:     { in: ["transcribing", "analyzing"] },
      processingStartedAt: { lt: stuckSince },
      retryCount: { gte: MAX_RETRY_COUNT },
    },
    data: {
      status:       "failed",
      errorMessage: `Processing abandoned after ${MAX_RETRY_COUNT} retries.`,
    },
  });

  // 3. Pick up queued calls that aren't yet being processed
  // (e.g. after a server restart where fire-and-forget tasks were lost)
  const pendingCalls = await db.call.findMany({
    where:   { status: "queued", retryCount: { lt: MAX_RETRY_COUNT } },
    select:  { id: true, source: true },
    orderBy: { createdAt: "asc" },
    take:    50,
  });

  for (const call of pendingCalls) {
    enqueueCall(call.id, `recover:${call.source}`);
  }

  return NextResponse.json({
    reset:     resetResult.count,
    abandoned: abandonResult.count,
    requeued:  pendingCalls.length,
  });
}
