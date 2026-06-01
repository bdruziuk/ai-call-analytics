import fs from 'fs';
import { unlink, access } from 'fs/promises';
import { db } from '@/lib/db';
import { openai } from '@/lib/openai';
import { analyzeCall } from '@/lib/analyzeCall';
import { detectCallLanguage } from '@/lib/analysis/detectLanguage';
import { incrementMinutesUsed } from '@/lib/planLimits';
import type { AnalysisLanguage } from '@/lib/analysis/prompts';

export async function processCall(callId: string) {
  const call = await db.call.findUnique({
    where: { id: callId },
  });

  if (!call) {
    throw new Error('Call not found');
  }

  if (call.status === 'completed') {
    return call;
  }

  // Guard: audio file must still be on disk.
  // After any processCall run (success or failure) the finally block deletes
  // the file, so a retry on the same call ID would hit ENOENT otherwise.
  try {
    await access(call.filePath);
  } catch {
    const updated = await db.call.update({
      where: { id: callId },
      data: {
        status: 'failed',
        errorMessage: 'Audio file no longer available — please re-upload.',
      },
    });
    return updated;
  }

  let durationSeconds = 0;

  try {
    // Read audio duration from file metadata before streaming to OpenAI.
    // gpt-4o-mini-transcribe does not support verbose_json, so we get
    // duration independently via music-metadata (ESM-only, loaded dynamically
    // so webpack doesn't try to bundle it — see serverExternalPackages in next.config.ts).
    try {
      const { parseFile } = await import('music-metadata');
      const meta = await parseFile(call.filePath);
      durationSeconds = Math.round(meta.format.duration ?? 0);
    } catch {
      // Non-fatal — duration stays 0 if metadata can't be read.
    }

    await db.call.update({
      where: { id: callId },
      data: { status: 'transcribing', errorMessage: null },
    });

    const rawTranscription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(call.filePath),
      model: 'gpt-4o-mini-transcribe',
      response_format: 'json',
    });

    const transcription = { text: rawTranscription.text };

    const langResult = await detectCallLanguage(transcription.text);

    if (langResult.detected === 'other') {
      await db.call.update({
        where: { id: callId },
        data: {
          status: 'failed',
          language: langResult.languageName,
          transcript: transcription.text,
          durationSeconds,
          errorMessage: `LANG_UNSUPPORTED:${langResult.languageName}`,
        },
      });
      // Still count minutes consumed even for unsupported-language calls
      if (call.userId) await incrementMinutesUsed(call.userId, durationSeconds);
      return await db.call.findUniqueOrThrow({ where: { id: callId } });
    }

    await db.call.update({
      where: { id: callId },
      data: {
        transcript: transcription.text,
        language: langResult.detected,
        durationSeconds,
        status: 'analyzing',
      },
    });

    const analysis = await analyzeCall(
      transcription.text,
      call.reportType as 'high_level' | 'medium' | 'detailed',
      langResult.detected as AnalysisLanguage
    );

    const completed = await db.call.update({
      where: { id: callId },
      data: {
        status: 'completed',

        summary:        analysis.summary,
        product:        analysis.product,
        saleStatus:     analysis.saleStatus,
        customerIntent: analysis.customerIntent,
        nextStep:       analysis.nextStep,
        score:          analysis.score,

        issues:          analysis.issues,
        positives:       analysis.positives,
        recommendations: analysis.recommendations,

        objections:      analysis.objections,
        managerMistakes: analysis.managerMistakes,
        detailedReport:  analysis.detailedReport,
      },
    });

    // Charge minutes to the user's subscription
    if (call.userId) await incrementMinutesUsed(call.userId, durationSeconds);

    return completed;
  } catch (error) {
    await db.call.update({
      where: { id: callId },
      data: {
        status: 'failed',
        durationSeconds,
        errorMessage:
          error instanceof Error ? error.message : 'Unknown processing error',
      },
    });

    throw error;
  } finally {
    try {
      await unlink(call.filePath);
    } catch (unlinkErr) {
      console.warn('[processCall] could not delete audio file:', unlinkErr);
    }
  }
}
