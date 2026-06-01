import { NextResponse } from "next/server";
import { validateApiKeyFromString } from "@/lib/apiAuth";
import { downloadAndQueueRecording, VALID_REPORT_TYPES } from "@/lib/integrationHelper";

/**
 * POST /api/integrations/twilio?key=aca_...&reportType=medium
 *
 * Twilio Status Callback — sent as application/x-www-form-urlencoded, not JSON.
 * Key fields: CallStatus, RecordingUrl, From, To, Duration, CallSid.
 *
 * Security note: for production deployments also validate the X-Twilio-Signature
 * header using your auth token. See https://www.twilio.com/docs/usage/security
 */
export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const key        = searchParams.get("key") ?? "";
  const reportType = searchParams.get("reportType") ?? "medium";

  const auth = await validateApiKeyFromString(key);
  if (!auth) return NextResponse.json({ error: "Invalid or missing API key" }, { status: 401 });
  if (!VALID_REPORT_TYPES.includes(reportType as typeof VALID_REPORT_TYPES[number]))
    return NextResponse.json({ error: "reportType must be one of: high_level, medium, detailed" }, { status: 400 });

  // Twilio sends form-encoded data
  let params: URLSearchParams;
  try {
    const text = await request.text();
    params = new URLSearchParams(text);
  } catch {
    return NextResponse.json({ error: "Expected form-encoded body" }, { status: 400 });
  }

  const callStatus = params.get("CallStatus") ?? "";
  if (callStatus !== "completed")
    return NextResponse.json({ skipped: true, reason: `CallStatus is ${callStatus}` });

  let recordingUrl = params.get("RecordingUrl") ?? "";
  if (!recordingUrl) return NextResponse.json({ error: "No RecordingUrl in payload" }, { status: 400 });

  // Twilio recording URLs need an extension; append .mp3 if not already present
  if (!/\.(mp3|wav|ogg|flac|aac)$/i.test(recordingUrl)) {
    recordingUrl = `${recordingUrl}.mp3`;
  }

  try {
    const result = await downloadAndQueueRecording({ recordingUrl, reportType, userId: auth.userId, prefix: "twilio" });
    return NextResponse.json(result);
  } catch (err) {
    console.error("[POST /api/integrations/twilio]", err);
    if (err instanceof Error && err.message.startsWith("HTTP"))
      return NextResponse.json({ error: `Failed to download recording: ${err.message}` }, { status: 502 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
