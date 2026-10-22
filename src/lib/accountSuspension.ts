import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logApiRequest } from "@/lib/apiLog";

export const ACCOUNT_SUSPENDED_ERROR = "account_suspended";

export async function isUserSuspended(userId: string): Promise<boolean> {
  const user = await db.user.findUnique({
    where:  { id: userId },
    select: { suspendedAt: true },
  });
  return !!user?.suspendedAt;
}

/**
 * Returns a 403 response when the account is suspended, otherwise null.
 * Used by every call-ingestion endpoint (v1 API, telephony webhooks, UI upload)
 * so a suspended account cannot add new calls for analysis.
 * Pass `endpoint` to also record the rejection in the API log.
 */
export async function rejectIfSuspended(
  userId: string,
  endpoint?: string,
): Promise<NextResponse | null> {
  if (!(await isUserSuspended(userId))) return null;
  if (endpoint) logApiRequest(userId, endpoint, "suspended", 403);
  return NextResponse.json({ error: ACCOUNT_SUSPENDED_ERROR }, { status: 403 });
}
