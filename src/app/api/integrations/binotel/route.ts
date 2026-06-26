import { NextResponse } from "next/server";
import { validateApiKeyFromString } from "@/lib/apiAuth";
import { downloadAndQueueRecording, VALID_REPORT_TYPES } from "@/lib/integrationHelper";

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const key        = searchParams.get("key") ?? "";
  const reportType = searchParams.get("reportType") ?? "medium";

  const auth = await validateApiKeyFromString(key);
  if (!auth) return NextResponse.json({ error: "Invalid or missing API key" }, { status: 401 });
  if (!VALID_REPORT_TYPES.includes(reportType as typeof VALID_REPORT_TYPES[number]))
    return NextResponse.json({ error: "reportType must be one of: high_level, medium, detailed" }, { status: 400 });

  let body: Record<string, unknown>;
  const contentType = request.headers.get("content-type") ?? "";
  try {
    if (contentType.includes("application/json")) {
      body = await request.json();
    } else {
      const text = await request.text();
      console.log("[binotel] raw body:", text);
      body = Object.fromEntries(new URLSearchParams(text));
    }
  } catch {
    return NextResponse.json({ error: "Failed to parse request body" }, { status: 400 });
  }

  console.log("[binotel] payload keys:", Object.keys(body), JSON.stringify(body));

  const disposition = body.disposition ? String(body.disposition).toUpperCase() : null;
  if (disposition && disposition !== "ANSWERED")
    return NextResponse.json({ skipped: true, reason: `call disposition is ${disposition}` });

  const recordingUrl = String(body.file ?? body.file_url ?? body.record_url ?? body.recording_url ?? "");
  if (!recordingUrl) return NextResponse.json({ error: "No recording URL in payload" }, { status: 400 });

  try {
    const result = await downloadAndQueueRecording({ recordingUrl, reportType, userId: auth.userId, prefix: "binotel" });
    return NextResponse.json(result);
  } catch (err) {
    console.error("[POST /api/integrations/binotel]", err);
    if (err instanceof Error && err.message.startsWith("HTTP"))
      return NextResponse.json({ error: `Failed to download recording: ${err.message}` }, { status: 502 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
