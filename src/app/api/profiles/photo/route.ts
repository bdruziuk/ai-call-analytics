import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file || !file.type.startsWith("image/"))
    return NextResponse.json({ error: "Invalid file" }, { status: 400 });

  const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase();
  const filename = `${randomUUID()}.${ext}`;
  const dir = join(process.cwd(), "public", "uploads", "profiles");

  await mkdir(dir, { recursive: true });

  const bytes = await file.arrayBuffer();
  await writeFile(join(dir, filename), Buffer.from(bytes));

  return NextResponse.json({ url: `/uploads/profiles/${filename}` });
}
