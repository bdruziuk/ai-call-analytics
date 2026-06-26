import { db } from "@/lib/db";

export type ApiLogStatus = "success" | "skipped" | "error" | "auth_failed" | "no_recording" | "invalid_params";

export function logApiRequest(
  userId: string,
  endpoint: string,
  status: ApiLogStatus,
  statusCode: number,
): void {
  db.apiLog
    .create({ data: { userId, endpoint, status, statusCode } })
    .catch(() => {});
}
