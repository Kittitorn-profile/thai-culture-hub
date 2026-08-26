import type { NextRequest } from 'next/server';

import { NextResponse } from 'next/server';

import { getSupabaseAdmin } from 'src/server/supabase-admin';
import { verifyAdminRequest } from 'src/server/admin-api-auth';

import { ADMIN_PERMISSION } from 'src/auth/admin-permissions';

const MAX_EVENT_IMAGE_SIZE = 2 * 1024 * 1024;
const ALLOWED_EVENT_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);
const EVENTS_ASSETS_BUCKET =
  process.env.EVENTS_ASSETS_BUCKET ?? process.env.CREATOR_ASSETS_BUCKET ?? 'creator-assets';

function getSafeFilename(fileName: string) {
  const extension = fileName.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  const randomPart =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  return `${randomPart}.${extension}`;
}

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  if (!(await verifyAdminRequest(request, ADMIN_PERMISSION.homeContent))) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get('file');

  if (!(file instanceof File)) {
    return NextResponse.json({ message: 'กรุณาเลือกรูปภาพ' }, { status: 400 });
  }

  if (!ALLOWED_EVENT_IMAGE_TYPES.has(file.type)) {
    return NextResponse.json(
      { message: 'รองรับเฉพาะไฟล์ JPG, PNG, WebP และ GIF เท่านั้น' },
      { status: 400 }
    );
  }

  if (file.size > MAX_EVENT_IMAGE_SIZE) {
    return NextResponse.json({ message: 'รูปภาพต้องมีขนาดไม่เกิน 2 MB' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  if (!supabase.ok) {
    return NextResponse.json({ message: supabase.error }, { status: 500 });
  }

  const filePath = `events/${new Date().getFullYear()}/${getSafeFilename(file.name)}`;
  const uploadBody = Buffer.from(await file.arrayBuffer());
  const { error: uploadError } = await supabase.client.storage
    .from(EVENTS_ASSETS_BUCKET)
    .upload(filePath, uploadBody, {
      contentType: file.type,
      upsert: true,
    });

  if (uploadError) {
    console.error('[admin/events/upload] Supabase Storage upload failed', {
      bucket: EVENTS_ASSETS_BUCKET,
      fileType: file.type,
      fileSize: file.size,
      message: uploadError.message,
      name: uploadError.name,
    });

    const bucketMessage = uploadError.message.toLowerCase().includes('bucket')
      ? `ไม่พบ Supabase Storage bucket "${EVENTS_ASSETS_BUCKET}" กรุณารัน docs/supabase-creator-assets-storage.sql`
      : uploadError.message;

    return NextResponse.json(
      {
        message: `อัปโหลดรูปไม่สำเร็จ: ${bucketMessage}`,
      },
      { status: 500 }
    );
  }

  const { data: publicUrlData } = supabase.client.storage
    .from(EVENTS_ASSETS_BUCKET)
    .getPublicUrl(filePath);

  return NextResponse.json({
    data: {
      url: publicUrlData.publicUrl,
      path: filePath,
    },
  });
}
