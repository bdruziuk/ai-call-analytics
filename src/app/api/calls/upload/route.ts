import { NextResponse } from 'next/server';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { db } from '@/lib/db';
import { checkUploadAllowed, getOrCreateSubscription } from '@/lib/planLimits';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ── Plan limit check ──────────────────────────────────────────────────
    const limitCheck = await checkUploadAllowed(session.user.id);
    if (!limitCheck.allowed) {
      return NextResponse.json(
        { error: 'minute_limit_exceeded', planId: limitCheck.planId },
        { status: 403 },
      );
    }

    const formData = await request.formData();

    const file          = formData.get('file');
    const salesProfileId = formData.get('salesProfileId')?.toString() || null;

    // Enforce report-type restrictions per plan:
    //   free    → high_level only
    //   starter → high_level or medium (detailed not allowed)
    //   growth+ → all types allowed
    const sub     = await getOrCreateSubscription(session.user.id);
    const rawType = String(formData.get('reportType') || 'medium');
    let reportType = rawType;
    if (sub.planId === 'free' && rawType !== 'high_level') {
      reportType = 'high_level';
    } else if (sub.planId === 'starter' && rawType === 'detailed') {
      reportType = 'medium';
    }

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Audio file is required' }, { status: 400 });
    }

    const bytes  = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadDir = path.join(process.cwd(), 'uploads');
    await mkdir(uploadDir, { recursive: true });

    const safeFileName = `${Date.now()}-${file.name}`;
    const filePath     = path.join(uploadDir, safeFileName);
    await writeFile(filePath, buffer);

    const call = await db.call.create({
      data: {
        fileName:       file.name,
        filePath,
        status:         'queued',
        source:         'manual',
        reportType,
        userId:         session.user.id,
        salesProfileId: salesProfileId || null,
      },
    });

    // Processing is triggered by the client via POST /api/calls/[id]/process
    // (either DashboardClient.startProcessing or the CallProcessing component).
    // We intentionally do NOT fire it here to avoid double-processing races.
    return NextResponse.json({ id: call.id, status: call.status });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to upload call' }, { status: 500 });
  }
}
