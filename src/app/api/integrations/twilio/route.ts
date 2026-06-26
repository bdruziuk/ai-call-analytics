import { NextResponse } from "next/server";
import { validateApiKeyFromString } from "@/lib/apiAuth";
import { downloadAndQueueRecording, VALID_REPORT_TYPES } from "@/lib/integrationHelper";
import { logApiRequest } from "@/lib/apiLog";

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const key        = searchParams.get("key") ?? "";
  const reportType = searchParams.get("reportType") ?? "medium";

  const auth = await validateApiKeyFromString(key);
  if (!auth) return NextResponse.json({ error: "Invalid or missing API key" }, { status: 401 });
  if (!VALID_REPORT_TYPES.includes(reportType as typeof VALID_REPORT_TYPES[number])) {
    logApiRequest(auth.userId, "twilio", "invalid_params", 400);
    return NextResponse.json({ error: "reportType must be one of: high_level, medium, detailed" }, { status: 400 });
  }

  let params: URLSearchParams;
  try {
    const text = await request.text();
    params = new URLSearchParams(text);
  } catch {
    logApiRequest(auth.userId, "twilio", "error", 400);
    return NextResponse.json({ error: "Expected form-encoded body" }, { status: 400 });
  }

  const callStatus = params.get("CallStatus") ?? "";
  if (callStatus !== "completed") {
    logApiRequest(auth.userId, "twilio", "skipped", 200);
    return NextResponse.json({ skipped: true, reason: `CallStatus is ${callStatus}` });
  }

  let recordingUrl = params.get("RecordingUrl") ?? "";
  if (!recordingUrl) {
    logApiRequest(auth.userId, "twilio", "no_recording", 400);
    return NextResponse.json({ error: "No RecordingUrl in payload" }, { status: 400 });
  }

  if (!/\.(mp3|wav|ogg|flac|aac)$/i.test(recordingUrl)) {
    recordingUrl = `${recordingUrl}.mp3`;
  }

  try {
    const result = await downloadAndQueueRecording({ recordingUrl, reportType, userId: auth.userId, prefix: "twilio" });
    logApiRequest(auth.userId, "twilio", "success", 200);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[POST /api/integrations/twilio]", err);
    logApiRequest(auth.userId, "twilio", "error", 502);
    if (err instanceof Error && err.message.startsWith("HTTP"))
      return NextResponse.json({ error: `Failed to download recording: ${err.message}` }, { status: 502 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
