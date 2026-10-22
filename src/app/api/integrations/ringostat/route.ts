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

  const suspended = await rejectIfSuspended(auth.userId, "ringostat");
  if (suspended) return suspended;
  if (!VALID_REPORT_TYPES.includes(reportType as typeof VALID_REPORT_TYPES[number])) {
    logApiRequest(auth.userId, "ringostat", "invalid_params", 400);
    return NextResponse.json({ error: "reportType must be one of: high_level, medium, detailed" }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try { body = await request.json(); }
  catch {
    logApiRequest(auth.userId, "ringostat", "error", 400);
    return NextResponse.json({ error: "Expected JSON body" }, { status: 400 });
  }

  const callStatus = body.callStatus ? String(body.callStatus).toLowerCase() : null;
  if (callStatus && callStatus !== "answered") {
    logApiRequest(auth.userId, "ringostat", "skipped", 200);
    return NextResponse.json({ skipped: true, reason: `callStatus is ${callStatus}` });
  }

  const recordingUrl = String(body.recordFile ?? body.record_url ?? body.file ?? "");
  if (!recordingUrl) {
    logApiRequest(auth.userId, "ringostat", "no_recording", 400);
    return NextResponse.json({ error: "No recording URL in payload" }, { status: 400 });
  }

  try {
    const result = await downloadAndQueueRecording({ recordingUrl, reportType, userId: auth.userId, prefix: "ringostat" });
    logApiRequest(auth.userId, "ringostat", "success", 200);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[POST /api/integrations/ringostat]", err);
    logApiRequest(auth.userId, "ringostat", "error", 502);
    if (err instanceof Error && err.message.startsWith("HTTP"))
      return NextResponse.json({ error: `Failed to download recording: ${err.message}` }, { status: 502 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
