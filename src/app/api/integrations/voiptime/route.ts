import { NextResponse } from "next/server";
import { validateApiKeyFromString } from "@/lib/apiAuth";
import { downloadAndQueueRecording, VALID_REPORT_TYPES } from "@/lib/integrationHelper";

/**
 * POST /api/integrations/voiptime?key=aca_...&reportType=medium
 *
 * VoIPTime Cloud sends a webhook after each call.
 * Expected payload: { event, call: { status, record_url, ... } }
 */
export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const key        = searchParams.get("key") ?? "";
  const reportType = searchParams.get("reportType") ?? "medium";

  const auth = await validateApiKeyFromString(key);
  if (!auth) return NextResponse.json({ error: "Invalid or missing API key" }, { status: 401 });
  if (!VALID_REPORT_TYPES.includes(reportType as typeof VALID_REPORT_TYPES[number]))
    return NextResponse.json({ error: "reportType must be one of: high_level, medium, detailed" }, { status: 400 });

  let body: Record<string, unknown>;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Expected JSON body" }, { status: 400 }); }

  // Call data may be nested under a "call" key
  const call = (body.call ?? body) as Record<string, unknown>;

  const status = String(call.status ?? "").toLowerCase();
  if (status && status !== "answered")
    return NextResponse.json({ skipped: true, reason: `call status is ${status}` });

  const recordingUrl = String(call.record_url ?? call.recording_url ?? call.file ?? "");
  if (!recordingUrl) return NextResponse.json({ error: "No recording URL in payload" }, { status: 400 });

  try {
    const result = await downloadAndQueueRecording({ recordingUrl, reportType, userId: auth.userId, prefix: "voiptime" });
    return NextResponse.json(result);
  } catch (err) {
    console.error("[POST /api/integrations/voiptime]", err);
    if (err instanceof Error && err.message.startsWith("HTTP"))
      return NextResponse.json({ error: `Failed to download recording: ${err.message}` }, { status: 502 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
