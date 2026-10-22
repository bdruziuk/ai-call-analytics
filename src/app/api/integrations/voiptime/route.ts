import { NextResponse } from "next/server";
import { validateApiKeyFromString } from "@/lib/apiAuth";
import { rejectIfSuspended } from "@/lib/accountSuspension";
import { downloadAndQueueRecording, VALID_REPORT_TYPES } from "@/lib/integrationHelper";
import { logApiRequest } from "@/lib/apiLog";

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const key        = searchParams.get("key") ?? "";
  const reportType = searchParams.get("reportType") ?? "medium";

  const auth = await validateApiKeyFromString(key);
  if (!auth) return NextResponse.json({ error: "Invalid or missing API key" }, { status: 401 });

  const suspended = await rejectIfSuspended(auth.userId, "voiptime");
  if (suspended) return suspended;
  if (!VALID_REPORT_TYPES.includes(reportType as typeof VALID_REPORT_TYPES[number])) {
    logApiRequest(auth.userId, "voiptime", "invalid_params", 400);
    return NextResponse.json({ error: "reportType must be one of: high_level, medium, detailed" }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try { body = await request.json(); }
  catch {
    logApiRequest(auth.userId, "voiptime", "error", 400);
    return NextResponse.json({ error: "Expected JSON body" }, { status: 400 });
  }

  const call = (body.call ?? body) as Record<string, unknown>;

  const status = String(call.status ?? "").toLowerCase();
  if (status && status !== "answered") {
    logApiRequest(auth.userId, "voiptime", "skipped", 200);
    return NextResponse.json({ skipped: true, reason: `call status is ${status}` });
  }

  const recordingUrl = String(call.record_url ?? call.recording_url ?? call.file ?? "");
  if (!recordingUrl) {
    logApiRequest(auth.userId, "voiptime", "no_recording", 400);
    return NextResponse.json({ error: "No recording URL in payload" }, { status: 400 });
  }

  try {
    const result = await downloadAndQueueRecording({ recordingUrl, reportType, userId: auth.userId, prefix: "voiptime" });
    logApiRequest(auth.userId, "voiptime", "success", 200);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[POST /api/integrations/voiptime]", err);
    logApiRequest(auth.userId, "voiptime", "error", 502);
    if (err instanceof Error && err.message.startsWith("HTTP"))
      return NextResponse.json({ error: `Failed to download recording: ${err.message}` }, { status: 502 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
