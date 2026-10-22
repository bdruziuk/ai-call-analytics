import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { db } from "@/lib/db";
import { enqueueCall } from "@/services/call.service";
import { rejectIfSuspended } from "@/lib/accountSuspension";

type Props = { params: Promise<{ id: string }> };

export async function POST(_: Request, { params }: Props) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const existing = await db.call.findUnique({
      where:  { id },
      select: { id: true, userId: true, status: true },
    });

    if (!existing) return NextResponse.json({ error: "Call not found" }, { status: 404 });
    if (existing.userId !== session.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (existing.status === "completed") return NextResponse.json({ error: "Already completed" }, { status: 409 });

    const suspended = await rejectIfSuspended(session.user.id);
    if (suspended) return suspended;

    // Already in-flight — no need to re-enqueue.
    if (existing.status === "transcribing" || existing.status === "analyzing") {
      return NextResponse.json(existing, { status: 202 });
    }

    // Enqueue through the concurrency limiter and return immediately.
    // The client polls GET /api/calls/[id] for status updates.
    enqueueCall(id, "manual");

    return NextResponse.json({ id, status: "queued" }, { status: 202 });
  } catch (err) {
    console.error("[POST /api/calls/[id]/process] unhandled error:", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
