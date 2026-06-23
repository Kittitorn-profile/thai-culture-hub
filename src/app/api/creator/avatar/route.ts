import type { NextRequest } from 'next/server';

import { NextResponse } from 'next/server';

import {
  getBearerToken,
  mapCreatorProfile,
  getCreatorProfileByUserId,
  verifyCreatorAccessToken,
} from 'src/server/creator-auth';

export const runtime = 'nodejs';

const MAX_COMPRESSED_AVATAR_SIZE = 512 * 1024;
const CREATOR_ASSETS_BUCKET = process.env.CREATOR_ASSETS_BUCKET ?? 'creator-assets';

function getSafeFilename(fileName: string) {
  const extension = fileName.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';

  return `${Date.now()}.${extension}`;
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

  const formData = await request.formData().catch(() => null);
  const file = formData?.get('file');

  if (!(file instanceof File)) {
    return NextResponse.json({ message: 'กรุณาเลือกรูปภาพ' }, { status: 400 });
  }

  if (!file.type.startsWith('image/')) {
    return NextResponse.json({ message: 'รองรับเฉพาะไฟล์รูปภาพเท่านั้น' }, { status: 400 });
  }

  if (file.size > MAX_COMPRESSED_AVATAR_SIZE) {
    return NextResponse.json(
      { message: 'รูปภาพหลังบีบอัดต้องมีขนาดไม่เกิน 0.5 MB' },
      { status: 400 }
    );
  }

  const filePath = `creators/${profileResult.profile.id}/avatar/${getSafeFilename(file.name)}`;
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

  const { data, error } = await auth.supabase
    .from('creator_profiles')
    .update({ avatar_url: publicUrlData.publicUrl })
    .eq('id', profileResult.profile.id)
    .select(
      'id, user_id, email, display_name, bio, phone, province_code, website_url, facebook_url, avatar_url, status, reviewed_at, reject_reason, created_at, updated_at'
    )
    .single();

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: mapCreatorProfile(data) });
}
