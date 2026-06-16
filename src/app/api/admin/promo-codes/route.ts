import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { db } from "@/lib/db";
import { PLAN_ORDER } from "@/lib/plans";

/* ── Shared admin guard ──────────────────────────────────────────────────── */

function isAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  const list = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.toLowerCase());
}

/* ── Code generator ──────────────────────────────────────────────────────── */

const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I confusion

function generateCode(planId: string): string {
  const suffix = Array.from(
    { length: 8 },
    () => CHARS[Math.floor(Math.random() * CHARS.length)],
  ).join("");
  return `${planId.toUpperCase()}-${suffix}`;
}

/* ── GET /api/admin/promo-codes — list all codes ─────────────────────────── */

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!isAdmin(session?.user?.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const codes = await db.promoCode.findMany({
    orderBy: { createdAt: "desc" },
  });

  const serialised = codes.map((c) => ({
    ...c,
    createdAt: c.createdAt.toISOString(),
    usedAt:    c.usedAt?.toISOString() ?? null,
  }));

  return NextResponse.json({ codes: serialised });
}

/* ── POST /api/admin/promo-codes — create a new code ─────────────────────── */

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!isAdmin(session?.user?.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { planId } = await request.json();

  if (!PLAN_ORDER.includes(planId)) {
    return NextResponse.json({ error: "INVALID_PLAN" }, { status: 400 });
  }

  // Generate a unique code (retry on collision — extremely unlikely)
  let code: string;
  let attempts = 0;
  do {
    code = generateCode(planId);
    const exists = await db.promoCode.findUnique({ where: { code } });
    if (!exists) break;
    attempts++;
  } while (attempts < 5);

  const created = await db.promoCode.create({
    data: {
      code,
      planId,
      createdBy: session!.user!.email!,
    },
  });

  return NextResponse.json({
    ...created,
    createdAt: created.createdAt.toISOString(),
    usedAt:    null,
  }, { status: 201 });
}
