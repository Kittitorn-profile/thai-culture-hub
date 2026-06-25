import type { NextRequest } from 'next/server';

import { NextResponse } from 'next/server';

import { getSupabaseAdmin } from 'src/server/supabase-admin';

export const runtime = 'nodejs';

const MAX_COMPRESSED_AVATAR_SIZE = 512 * 1024;
const ADMIN_ASSETS_BUCKET =
  process.env.ADMIN_ASSETS_BUCKET ?? process.env.CREATOR_ASSETS_BUCKET ?? 'creator-assets';

function getBearerToken(request: NextRequest) {
  return request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1] ?? '';
}

function getSafeFilename(fileName: string) {
  const extension = fileName.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';

  return `${Date.now()}.${extension}`;
}

export async function POST(request: NextRequest) {
  const token = getBearerToken(request);

  if (!token) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();

  if (!supabase.ok) {
    return NextResponse.json({ message: supabase.error }, { status: 500 });
  }

  const { data: authData, error: authError } = await supabase.client.auth.getUser(token);

  if (authError || !authData.user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
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

  const filePath = `admins/${authData.user.id}/avatar/${getSafeFilename(file.name)}`;
  const uploadBody = Buffer.from(await file.arrayBuffer());
  const { error: uploadError } = await supabase.client.storage
    .from(ADMIN_ASSETS_BUCKET)
    .upload(filePath, uploadBody, {
      contentType: file.type,
      upsert: true,
    });

  if (uploadError) {
    return NextResponse.json(
      {
        message: `อัปโหลดรูปไม่สำเร็จ: ${uploadError.message}. ตรวจสอบว่า Supabase Storage bucket "${ADMIN_ASSETS_BUCKET}" ถูกสร้างแล้ว`,
      },
      { status: 500 }
    );
  }

  const { data: publicUrlData } = supabase.client.storage
    .from(ADMIN_ASSETS_BUCKET)
    .getPublicUrl(filePath);

  const photoUrl = publicUrlData.publicUrl;
  const currentMetadata = authData.user.user_metadata ?? {};
  const { error: updateError } = await supabase.client.auth.admin.updateUserById(authData.user.id, {
    user_metadata: {
      ...currentMetadata,
      photo_url: photoUrl,
    },
  });

  if (updateError) {
    return NextResponse.json({ message: updateError.message }, { status: 500 });
  }

  return NextResponse.json({
    data: {
      photoUrl,
    },
  });
}
