import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";

const MAX_BYTES = 2 * 1024 * 1024; // 2 MB

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file || !file.type.startsWith("image/"))
    return NextResponse.json({ error: "Invalid file" }, { status: 400 });

  if (file.size > MAX_BYTES)
    return NextResponse.json({ error: "File too large (max 2 MB)" }, { status: 413 });

  const bytes  = await file.arrayBuffer();
  const base64 = Buffer.from(bytes).toString("base64");
  const url    = `data:${file.type};base64,${base64}`;

  return NextResponse.json({ url });
}
