import { NextResponse } from "next/server";
import { validateApiKeyFromString } from "@/lib/apiAuth";
import { downloadAndQueueRecording, VALID_REPORT_TYPES } from "@/lib/integrationHelper";

/**
 * POST /api/integrations/keycrm?key=aca_...&reportType=medium
 *
 * KeyCRM sends a webhook when a call recording is available.
 * Expected payload: { event: "call.completed", data: { status, recording_url, ... } }
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

  // Skip non-call events
  if (body.event && body.event !== "call.completed")
    return NextResponse.json({ skipped: true, reason: `event is ${body.event}` });

  const data = (body.data ?? body) as Record<string, unknown>;

  const status = data.status ? String(data.status).toLowerCase() : null;
  if (status && status !== "answered")
    return NextResponse.json({ skipped: true, reason: `call status is ${status}` });

  const recordingUrl = String(data.recording_url ?? data.record_url ?? data.file ?? "");
  if (!recordingUrl) return NextResponse.json({ error: "No recording URL in payload" }, { status: 400 });

  try {
    const result = await downloadAndQueueRecording({ recordingUrl, reportType, userId: auth.userId, prefix: "keycrm" });
    return NextResponse.json(result);
  } catch (err) {
    console.error("[POST /api/integrations/keycrm]", err);
    if (err instanceof Error && err.message.startsWith("HTTP"))
      return NextResponse.json({ error: `Failed to download recording: ${err.message}` }, { status: 502 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
