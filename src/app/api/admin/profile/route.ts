import type { NextRequest } from 'next/server';

import { NextResponse } from 'next/server';

import { getSupabaseAdmin } from 'src/server/supabase-admin';

function getBearerToken(request: NextRequest) {
  return request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1] ?? '';
}

function cleanText(value: FormDataEntryValue | null) {
  return typeof value === 'string' ? value.trim() : '';
}

function isValidPhotoUrl(value: string) {
  if (!value) {
    return true;
  }

  try {
    const url = new URL(value);

    return ['http:', 'https:'].includes(url.protocol);
  } catch {
    return false;
  }
}

export const runtime = 'nodejs';

export async function PUT(request: NextRequest) {
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

  const formData = await request.formData();
  const firstName = cleanText(formData.get('firstName'));
  const lastName = cleanText(formData.get('lastName'));
  const photoUrl = cleanText(formData.get('photoUrl'));

  if (!firstName || !lastName) {
    return NextResponse.json({ message: 'กรุณากรอกชื่อและนามสกุล' }, { status: 400 });
  }

  if (!isValidPhotoUrl(photoUrl)) {
    return NextResponse.json({ message: 'ลิงก์รูปภาพต้องเป็น URL ที่ถูกต้อง' }, { status: 400 });
  }

  const currentMetadata = authData.user.user_metadata ?? {};
  const displayName = `${firstName} ${lastName}`.trim();
  const { data, error } = await supabase.client.auth.admin.updateUserById(authData.user.id, {
    user_metadata: {
      ...currentMetadata,
      first_name: firstName,
      last_name: lastName,
      display_name: displayName,
      photo_url: photoUrl || null,
    },
  });

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({
    data: {
      id: data.user.id,
      email: data.user.email,
      firstName,
      lastName,
      displayName,
      photoURL: photoUrl,
    },
  });
}
