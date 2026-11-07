import type { NextRequest } from 'next/server';

import { NextResponse } from 'next/server';

import { readAuthBody } from 'src/server/auth-request';

import provinces from 'src/data/thailand-culture/provinces';
import { hashPassword } from 'src/server/password';
import { getSupabaseAdmin } from 'src/server/supabase-admin';
import { cleanText, mapCreatorProfile } from 'src/server/creator-auth';

export const runtime = 'nodejs';

const USERS_TABLE = process.env.ADMIN_USERS_TABLE ?? 'user';

export async function POST(request: NextRequest) {
  const body = await readAuthBody(request);
  const email = cleanText(body.email).toLowerCase();
  const password = typeof body.password === 'string' ? body.password : '';
  const confirmPassword = typeof body.confirmPassword === 'string' ? body.confirmPassword : '';
  const firstName = cleanText(body.firstName);
  const lastName = cleanText(body.lastName);
  const displayName = cleanText(body.displayName) || `${firstName} ${lastName}`.trim() || email;
  const bio = cleanText(body.bio);
  const phone = cleanText(body.phone);
  const provinceCode = cleanText(body.provinceCode);

  if (body.acceptTerms !== true) {
    return NextResponse.json({ message: 'กรุณายอมรับเงื่อนไขการใช้บริการ' }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ message: 'รูปแบบอีเมลไม่ถูกต้อง' }, { status: 400 });
  }

  if (!email || !password || !displayName || !provinceCode) {
    return NextResponse.json(
      { message: 'Email, password, display name and province are required' },
      { status: 400 }
    );
  }

  if (password.length < 6) {
    return NextResponse.json(
      { message: 'Password must be at least 6 characters' },
      { status: 400 }
    );
  }

  if (password !== confirmPassword) {
    return NextResponse.json({ message: 'Password confirmation does not match' }, { status: 400 });
  }

  if (!provinces.some((province) => province.code === provinceCode)) {
    return NextResponse.json({ message: 'Invalid province' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  if (!supabase.ok) {
    return NextResponse.json({ message: supabase.error }, { status: 500 });
  }

  const { data: existingEmailUser, error: existingUserError } = await supabase.client
    .from(USERS_TABLE)
    .select('id')
    .eq('email', email)
    .maybeSingle();

  if (existingUserError) {
    return NextResponse.json({ message: existingUserError.message }, { status: 500 });
  }

  if (existingEmailUser) {
    return NextResponse.json({ message: 'This email is already registered' }, { status: 409 });
  }

  const { data: createdUser, error: createError } = await supabase.client
    .from(USERS_TABLE)
    .insert({
      username: email,
      email,
      password_hash: await hashPassword(password),
      role: 'creator',
      is_active: false,
    })
    .select('id')
    .single();

  if (createError || !createdUser?.id) {
    return NextResponse.json(
      { message: createError?.message ?? 'Create user failed' },
      { status: 400 }
    );
  }

  const userId = String(createdUser.id);

  const { data: profile, error: profileError } = await supabase.client
    .from('creator_profiles')
    .insert({
      user_id: userId,
      email,
      display_name: displayName,
      bio,
      phone,
      province_code: provinceCode,
      status: 'pending',
    })
    .select(
      'id, user_id, email, display_name, bio, phone, province_code, website_url, facebook_url, avatar_url, status, reviewed_at, reject_reason, created_at, updated_at'
    )
    .single();

  if (profileError) {
    await supabase.client.from(USERS_TABLE).delete().eq('id', userId);
    return NextResponse.json({ message: profileError.message }, { status: 500 });
  }

  return NextResponse.json(
    { data: mapCreatorProfile(profile), message: 'Registration submitted' },
    { status: 201 }
  );
}
