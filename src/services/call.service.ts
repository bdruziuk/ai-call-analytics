import fs from "fs";
import { unlink, access } from "fs/promises";
import { db } from "@/lib/db";
import { openai } from "@/lib/openai";
import { analyzeCall } from "@/lib/analyzeCall";
import { detectCallLanguage } from "@/lib/analysis/detectLanguage";
import { incrementMinutesUsed } from "@/lib/planLimits";
import { processingLimiter } from "@/lib/concurrency";
import type { AnalysisLanguage } from "@/lib/analysis/prompts";

// Processing timeout: 15 minutes. Covers large files + slow OpenAI responses.
const PROCESSING_TIMEOUT_MS = parseInt(
  process.env.PROCESSING_TIMEOUT_MS ?? String(15 * 60 * 1000),
  10,
);

// Transient OpenAI error codes that are safe to retry.
const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);
const MAX_RETRIES = 3;

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const status = (err as { status?: number })?.status;
      if (!status || !RETRYABLE_STATUS_CODES.has(status)) throw err;
      // Exponential backoff: 2s, 4s, 8s
      await new Promise((r) => setTimeout(r, 2_000 * 2 ** attempt));
    }
  }
  throw lastErr;
}

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`TIMEOUT: ${label} exceeded ${ms / 1000}s`)),
      ms,
    );
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer!);
  }
}

// ── Core processing logic (runs inside the concurrency limiter) ───────────

async function runProcessCall(callId: string): Promise<Awaited<ReturnType<typeof db.call.findUniqueOrThrow>>> {
  const call = await db.call.findUnique({ where: { id: callId } });
  if (!call) throw new Error("Call not found");
  if (call.status === "completed") return call;

  // Guard: audio file must exist on disk. If missing, mark failed immediately.
  try {
    await access(call.filePath);
  } catch {
    return db.call.update({
      where: { id: callId },
      data: { status: "failed", errorMessage: "Audio file no longer available — please re-upload." },
    });
  }

  let durationSeconds = 0;

  try {
    await db.call.update({
      where: { id: callId },
      data: { status: "transcribing", errorMessage: null, processingStartedAt: new Date() },
    });

    try {
      const { parseFile } = await import("music-metadata");
      const meta = await parseFile(call.filePath);
      durationSeconds = Math.round(meta.format.duration ?? 0);
    } catch {
      // Non-fatal — duration stays 0 if metadata can't be read.
    }

    const rawTranscription = await withRetry(() =>
      withTimeout(
        openai.audio.transcriptions.create({
          file: fs.createReadStream(call.filePath),
          model: "gpt-4o-mini-transcribe",
          response_format: "json",
        }),
        PROCESSING_TIMEOUT_MS,
        "transcription",
      ),
    );

    const langResult = await detectCallLanguage(rawTranscription.text);

    if (langResult.detected === "other") {
      if (call.userId) await incrementMinutesUsed(call.userId, durationSeconds);
      return db.call.update({
        where: { id: callId },
        data: {
          status: "failed",
          language: langResult.languageName,
          transcript: rawTranscription.text,
          durationSeconds,
          errorMessage: `LANG_UNSUPPORTED:${langResult.languageName}`,
        },
      });
    }

    await db.call.update({
      where: { id: callId },
      data: {
        transcript: rawTranscription.text,
        language: langResult.detected,
        durationSeconds,
        status: "analyzing",
      },
    });

    const analysis = await withRetry(() =>
      withTimeout(
        analyzeCall(
          rawTranscription.text,
          call.reportType as "high_level" | "medium" | "detailed",
          langResult.detected as AnalysisLanguage,
        ),
        PROCESSING_TIMEOUT_MS,
        "analysis",
      ),
    );

    const completed = await db.call.update({
      where: { id: callId },
      data: {
        status: "completed",
        summary:         analysis.summary,
        product:         analysis.product,
        saleStatus:      analysis.saleStatus,
        customerIntent:  analysis.customerIntent,
        nextStep:        analysis.nextStep,
        score:           analysis.score,
        issues:          analysis.issues,
        positives:       analysis.positives,
        recommendations: analysis.recommendations,
        objections:      analysis.objections,
        managerMistakes: analysis.managerMistakes,
        detailedReport:  analysis.detailedReport,
      },
    });

    if (call.userId) await incrementMinutesUsed(call.userId, durationSeconds);
    return completed;
  } catch (error) {
    await db.call.update({
      where: { id: callId },
      data: {
        status: "failed",
        durationSeconds,
        errorMessage: error instanceof Error ? error.message : "Unknown processing error",
      },
    });
    throw error;
  } finally {
    try {
      await unlink(call.filePath);
    } catch (unlinkErr) {
      console.warn("[processCall] could not delete audio file:", unlinkErr);
    }
  }
}

// ── Public API ────────────────────────────────────────────────────────────

/**
 * Process a call synchronously (waits for result).
 * Used by the manual /process route where the UI is waiting.
 * Still runs inside the concurrency limiter.
 */
export function processCall(callId: string) {
  return processingLimiter(() => runProcessCall(callId));
}

/**
 * Enqueue a call for background processing (fire-and-forget).
 * Used by webhooks and the v1 API where we return 202 immediately.
 * The call already has status "queued" in the DB; the limiter picks it up
 * when a slot is available.
 */
export function enqueueCall(callId: string, prefix = "enqueue"): void {
  processingLimiter(() => runProcessCall(callId)).catch((err) =>
    console.error(`[${prefix}] processCall ${callId}:`, err),
  );
}
