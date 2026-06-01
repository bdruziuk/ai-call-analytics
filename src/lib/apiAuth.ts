import crypto from "crypto";
import { db } from "@/lib/db";

export function hashApiKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

export function generateApiKey(): { raw: string; hash: string; prefix: string } {
  const raw = `aca_${crypto.randomBytes(24).toString("hex")}`;
  return { raw, hash: hashApiKey(raw), prefix: raw.slice(0, 12) };
}

export async function validateApiKey(
  request: Request,
): Promise<{ userId: string } | null> {
  const auth = request.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return null;

  const key = auth.slice(7).trim();
  if (!key.startsWith("aca_")) return null;

  const hash = hashApiKey(key);

  const record = await db.apiKey.findUnique({
    where: { keyHash: hash },
    select: { id: true, userId: true },
  });

  if (!record) return null;

  // Fire-and-forget: update lastUsedAt without blocking the response
  db.apiKey
    .update({ where: { id: record.id }, data: { lastUsedAt: new Date() } })
    .catch(() => {});

  return { userId: record.userId };
}

/** Validate a raw API key string (for query-param auth, e.g. Binotel webhooks). */
export async function validateApiKeyFromString(
  key: string,
): Promise<{ userId: string } | null> {
  if (!key.startsWith("aca_")) return null;

  const hash = hashApiKey(key);

  const record = await db.apiKey.findUnique({
    where: { keyHash: hash },
    select: { id: true, userId: true },
  });

  if (!record) return null;

  db.apiKey
    .update({ where: { id: record.id }, data: { lastUsedAt: new Date() } })
    .catch(() => {});

  return { userId: record.userId };
}
