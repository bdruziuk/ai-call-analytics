import { NextResponse } from "next/server";
import { validateApiKey } from "@/lib/apiAuth";
import { db } from "@/lib/db";

type Props = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Props) {
  const auth = await validateApiKey(request);
  if (!auth)
    return NextResponse.json({ error: "Invalid or missing API key" }, { status: 401 });

  const { id } = await params;

  const call = await db.call.findFirst({
    where: { id, userId: auth.userId },
    select: {
      id: true,
      fileName: true,
      status: true,
      reportType: true,
      language: true,
      product: true,
      saleStatus: true,
      score: true,
      summary: true,
      customerIntent: true,
      nextStep: true,
      issues: true,
      positives: true,
      recommendations: true,
      objections: true,
      managerMistakes: true,
      detailedReport: true,
      transcript: true,
      errorMessage: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!call)
    return NextResponse.json({ error: "Call not found" }, { status: 404 });

  return NextResponse.json(call);
}
