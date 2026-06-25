import type { NextRequest } from 'next/server';

import { NextResponse } from 'next/server';

import {
  cleanText,
  getBearerToken,
  getCreatorProfileByUserId,
  verifyCreatorAccessToken,
} from 'src/server/creator-auth';

export const runtime = 'nodejs';

const MAX_PLACE_CORRECTION_IMAGE_SIZE = 2 * 1024 * 1024;
const CREATOR_ASSETS_BUCKET = process.env.CREATOR_ASSETS_BUCKET ?? 'creator-assets';

function getSafeSegment(value: string, fallback: string) {
  return value.trim().replace(/[^a-zA-Z0-9_-]/g, '-') || fallback;
}

function getSafeFilename(fileName: string) {
  const extension = fileName.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  const baseName = fileName
    .replace(/\.[^.]+$/, '')
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '-')
    .slice(0, 48);

  return `${Date.now()}-${baseName || 'cover'}.${extension}`;
}

export async function POST(request: NextRequest) {
  const auth = await verifyCreatorAccessToken(getBearerToken(request.headers));

  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  const profileResult = await getCreatorProfileByUserId(auth.user.id);

  if (!profileResult.ok) {
    return NextResponse.json({ message: profileResult.message }, { status: profileResult.status });
  }

  if (profileResult.profile.status !== 'approved' || profileResult.profile.is_active === false) {
    return NextResponse.json({ message: 'Creator account is not active' }, { status: 403 });
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get('file');
  const placeId = cleanText(formData?.get('placeId'));

  if (!(file instanceof File)) {
    return NextResponse.json({ message: 'กรุณาเลือกรูปภาพ' }, { status: 400 });
  }

  if (!file.type.startsWith('image/')) {
    return NextResponse.json({ message: 'รองรับเฉพาะไฟล์รูปภาพเท่านั้น' }, { status: 400 });
  }

  if (file.size > MAX_PLACE_CORRECTION_IMAGE_SIZE) {
    return NextResponse.json({ message: 'รูปภาพต้องมีขนาดไม่เกิน 2 MB' }, { status: 400 });
  }

  const safePlaceId = getSafeSegment(placeId, 'unknown-place');
  const filePath = `creators/${profileResult.profile.id}/place-corrections/${safePlaceId}/${getSafeFilename(
    file.name
  )}`;
  const uploadBody = Buffer.from(await file.arrayBuffer());
  const { error: uploadError } = await auth.supabase.storage
    .from(CREATOR_ASSETS_BUCKET)
    .upload(filePath, uploadBody, {
      contentType: file.type,
      upsert: true,
    });

  if (uploadError) {
    return NextResponse.json(
      {
        message: `อัปโหลดรูปไม่สำเร็จ: ${uploadError.message}. ตรวจสอบว่า Supabase Storage bucket "${CREATOR_ASSETS_BUCKET}" ถูกสร้างแล้ว`,
      },
      { status: 500 }
    );
  }

  const { data: publicUrlData } = auth.supabase.storage
    .from(CREATOR_ASSETS_BUCKET)
    .getPublicUrl(filePath);

  return NextResponse.json({
    data: {
      url: publicUrlData.publicUrl,
      path: filePath,
    },
  });
}
