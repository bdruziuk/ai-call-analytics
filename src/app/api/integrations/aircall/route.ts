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
    logApiRequest(auth.userId, "aircall", "invalid_params", 400);
    return NextResponse.json({ error: "reportType must be one of: high_level, medium, detailed" }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try { body = await request.json(); }
  catch {
    logApiRequest(auth.userId, "aircall", "error", 400);
    return NextResponse.json({ error: "Expected JSON body" }, { status: 400 });
  }

  if (body.event && body.event !== "call.ended") {
    logApiRequest(auth.userId, "aircall", "skipped", 200);
    return NextResponse.json({ skipped: true, reason: `event is ${body.event}` });
  }

  const data = (body.data ?? {}) as Record<string, unknown>;
  const recordingUrl = String(data.recording ?? data.record_url ?? "");

  if (!recordingUrl || recordingUrl === "null") {
    logApiRequest(auth.userId, "aircall", "skipped", 200);
    return NextResponse.json({ skipped: true, reason: "no recording available (call not answered)" });
  }

  try {
    const result = await downloadAndQueueRecording({ recordingUrl, reportType, userId: auth.userId, prefix: "aircall" });
    logApiRequest(auth.userId, "aircall", "success", 200);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[POST /api/integrations/aircall]", err);
    logApiRequest(auth.userId, "aircall", "error", 502);
    if (err instanceof Error && err.message.startsWith("HTTP"))
      return NextResponse.json({ error: `Failed to download recording: ${err.message}` }, { status: 502 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
