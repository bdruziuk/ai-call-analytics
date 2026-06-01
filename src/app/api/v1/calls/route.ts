import { NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { validateApiKey } from "@/lib/apiAuth";
import { db } from "@/lib/db";
import { processCall } from "@/services/call.service";
import { checkUploadAllowed } from "@/lib/planLimits";

/* ── GET /api/v1/calls — list calls ─────────────────────────────────── */
export async function GET(request: Request) {
  const auth = await validateApiKey(request);
  if (!auth)
    return NextResponse.json({ error: "Invalid or missing API key" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const limit  = Math.min(Math.max(parseInt(searchParams.get("limit")  ?? "50"), 1), 100);
  const offset = Math.max(parseInt(searchParams.get("offset") ?? "0"), 0);
  const status = searchParams.get("status") ?? undefined;

  const where = { userId: auth.userId, ...(status ? { status } : {}) };

  const [calls, total] = await Promise.all([
    db.call.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
      select: {
        id: true,
        fileName: true,
        status: true,
        reportType: true,
        language: true,
        product: true,
        saleStatus: true,
        score: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    db.call.count({ where }),
  ]);

  return NextResponse.json({ calls, total, limit, offset });
}

/* ── POST /api/v1/calls — upload audio and start analysis ───────────── */
export async function POST(request: Request) {
  const auth = await validateApiKey(request);
  if (!auth)
    return NextResponse.json({ error: "Invalid or missing API key" }, { status: 401 });

  // ── Plan limit check ──────────────────────────────────────────────────
  const limitCheck = await checkUploadAllowed(auth.userId);
  if (!limitCheck.allowed) {
    return NextResponse.json(
      { error: "minute_limit_exceeded", planId: limitCheck.planId },
      { status: 403 },
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart/form-data" }, { status: 400 });
  }

  const file = formData.get("file");
  const reportType = String(formData.get("reportType") || "medium");

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Required field: file (audio/mpeg, audio/wav, …)" },
      { status: 400 },
    );
  }

  if (!["high_level", "medium", "detailed"].includes(reportType)) {
    return NextResponse.json(
      { error: "reportType must be one of: high_level, medium, detailed" },
      { status: 400 },
    );
  }

  try {
    const bytes  = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadDir = path.join(process.cwd(), "uploads");
    await mkdir(uploadDir, { recursive: true });

    const safeFileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const filePath = path.join(uploadDir, safeFileName);
    await writeFile(filePath, buffer);

    const call = await db.call.create({
      data: {
        fileName: file.name,
        filePath,
        status: "queued",
        reportType,
        userId: auth.userId,
      },
    });

    // Kick off processing without blocking the response
    processCall(call.id).catch((err) =>
      console.error("[POST /api/v1/calls] processCall error:", err),
    );

    return NextResponse.json(
      {
        id: call.id,
        status: call.status,
        fileName: call.fileName,
        reportType: call.reportType,
        createdAt: call.createdAt,
        pollUrl: `/api/v1/calls/${call.id}`,
      },
      { status: 202 },
    );
  } catch (err) {
    console.error("[POST /api/v1/calls]", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
