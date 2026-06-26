import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { db } from "@/lib/db";
import { processCall } from "@/services/call.service";
import { checkUploadAllowed } from "@/lib/planLimits";

export const VALID_REPORT_TYPES = ["high_level", "medium", "detailed"] as const;

/**
 * Download a recording from a URL, save it to /uploads, create a Call record
 * and fire processCall asynchronously.
 *
 * Returns `{ skipped: true, reason: "minute_limit_exceeded" }` when the user
 * has hit their plan limit (HTTP 200 — the webhook was delivered, just not
 * processed due to plan constraints).
 *
 * Throws with message starting "HTTP {code}" when the download fails with a
 * non-2xx response, so callers can return a 502.
 * Throws anything else on filesystem / DB errors.
 */
export async function downloadAndQueueRecording(opts: {
  recordingUrl: string;
  reportType: string;
  userId: string;
  /** Short prefix used in the saved filename and in log messages */
  prefix: string;
}): Promise<
  | { id: string; status: string; fileName: string; pollUrl: string }
  | { skipped: true; reason: string }
> {
  const { recordingUrl, reportType, userId, prefix } = opts;

  // ── Plan limit check ────────────────────────────────────────────────────
  const limitCheck = await checkUploadAllowed(userId);
  if (!limitCheck.allowed) {
    return { skipped: true, reason: "minute_limit_exceeded" };
  }

  const res = await fetch(recordingUrl, { redirect: "follow" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const contentType = res.headers.get("content-type") ?? "";
  const isAudio = contentType.startsWith("audio/") ||
    contentType.includes("octet-stream") ||
    contentType.includes("mpeg") ||
    contentType.includes("mp4") ||
    contentType.includes("ogg") ||
    contentType.includes("wav") ||
    contentType.includes("webm") ||
    contentType.includes("flac");

  if (!isAudio) {
    const snippet = (await res.text()).slice(0, 200);
    throw new Error(`HTTP_CONTENT Non-audio response (${contentType}): ${snippet}`);
  }

  const audioBuffer = Buffer.from(await res.arrayBuffer());

  const urlPathname = new URL(recordingUrl).pathname;
  const baseName =
    path.basename(urlPathname).replace(/[^a-zA-Z0-9._-]/g, "_") ||
    `${prefix}-${Date.now()}.mp3`;
  const safeFileName = `${Date.now()}-${prefix}-${baseName}`;

  const uploadDir = path.join(process.cwd(), "uploads");
  await mkdir(uploadDir, { recursive: true });
  const filePath = path.join(uploadDir, safeFileName);
  await writeFile(filePath, audioBuffer);

  const call = await db.call.create({
    data: { fileName: baseName, filePath, status: "queued", reportType, userId },
  });

  // Fire-and-forget — processCall deletes the file when it finishes
  processCall(call.id).catch((err) =>
    console.error(`[${prefix}] processCall:`, err),
  );

  return {
    id: call.id,
    status: call.status,
    fileName: call.fileName,
    pollUrl: `/api/v1/calls/${call.id}`,
  };
}
