import type { NextRequest } from 'next/server';

import { NextResponse } from 'next/server';

import { getSupabaseAdmin } from 'src/server/supabase-admin';
import { verifyAdminRequest } from 'src/server/admin-api-auth';

import { ADMIN_PERMISSION } from 'src/auth/admin-permissions';

export const runtime = 'nodejs';

const MAX_BADGE_IMAGE_SIZE = 2 * 1024 * 1024;
const CREATOR_ASSETS_BUCKET = process.env.CREATOR_ASSETS_BUCKET ?? 'creator-assets';

function getSafeFilename(fileName: string) {
  const extension = fileName.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'png';
  const randomPart =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  return `${randomPart}.${extension}`;
}

export async function POST(request: NextRequest) {
  if (!(await verifyAdminRequest(request, ADMIN_PERMISSION.creators))) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get('file');
  const badgeKey = String(formData?.get('badgeKey') ?? 'creator-badge')
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '-')
    .slice(0, 48);

  if (!(file instanceof File)) {
    return NextResponse.json({ message: 'กรุณาเลือกรูป badge' }, { status: 400 });
  }

  if (!file.type.startsWith('image/')) {
    return NextResponse.json({ message: 'รองรับเฉพาะไฟล์รูปภาพเท่านั้น' }, { status: 400 });
  }

  if (file.size > MAX_BADGE_IMAGE_SIZE) {
    return NextResponse.json({ message: 'รูป badge ต้องมีขนาดไม่เกิน 2 MB' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  if (!supabase.ok) {
    return NextResponse.json({ message: supabase.error }, { status: 500 });
  }

  const filePath = `creator-badges/${badgeKey || 'badge'}/${getSafeFilename(file.name)}`;
  const uploadBody = Buffer.from(await file.arrayBuffer());
  const { error: uploadError } = await supabase.client.storage
    .from(CREATOR_ASSETS_BUCKET)
    .upload(filePath, uploadBody, {
      contentType: file.type,
      upsert: true,
    });

  if (uploadError) {
    return NextResponse.json(
      {
        message: `อัปโหลดรูป badge ไม่สำเร็จ: ${uploadError.message}. ตรวจสอบว่า Supabase Storage bucket "${CREATOR_ASSETS_BUCKET}" ถูกสร้างแล้ว`,
      },
      { status: 500 }
    );
  }

  const { data: publicUrlData } = supabase.client.storage
    .from(CREATOR_ASSETS_BUCKET)
    .getPublicUrl(filePath);

  return NextResponse.json({
    data: {
      url: publicUrlData.publicUrl,
      path: filePath,
    },
  });
}
