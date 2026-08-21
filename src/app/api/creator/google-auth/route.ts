import type { NextRequest } from 'next/server';

import crypto from 'node:crypto';
import { NextResponse } from 'next/server';

import provinces from 'src/data/thailand-culture/provinces';
import { getSupabaseAdmin } from 'src/server/supabase-admin';
import { createAdminToken } from 'src/server/admin-api-auth';
import { cleanText, getBearerToken, mapCreatorProfile } from 'src/server/creator-auth';

export const runtime = 'nodejs';

const USERS_TABLE = process.env.ADMIN_USERS_TABLE ?? 'user';
const PROFILE_SELECT =
  'id, user_id, email, display_name, bio, phone, province_code, website_url, facebook_url, avatar_url, status, warning_note, warned_at, reviewed_at, reject_reason, created_at, updated_at';

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const accessToken = getBearerToken(request.headers);
  const supabase = getSupabaseAdmin();

  if (!accessToken || !supabase.ok) {
    return NextResponse.json(
      { message: supabase.ok ? 'ไม่พบข้อมูลยืนยันตัวตนจาก Google' : supabase.error },
      { status: supabase.ok ? 401 : 500 }
    );
  }

  const { data: authData, error: authError } = await supabase.client.auth.getUser(accessToken);
  const authUser = authData.user;
  const providers = authUser?.identities?.map((identity) => identity.provider) ?? [];

  if (authError || !authUser?.email || !providers.includes('google')) {
    return NextResponse.json({ message: 'การยืนยันตัวตนด้วย Google ไม่ถูกต้อง' }, { status: 401 });
  }

  const email = authUser.email.trim().toLowerCase();
  const displayName =
    cleanText(authUser.user_metadata?.full_name) ||
    cleanText(authUser.user_metadata?.name) ||
    email.split('@')[0];
  const avatarUrl = cleanText(authUser.user_metadata?.avatar_url);
  const requestedDisplayName = cleanText(body.displayName);
  const requestedPhone = cleanText(body.phone);
  const requestedProvinceCode = cleanText(body.provinceCode);
  const requestedBio = cleanText(body.bio);
  const provinceCode = provinces.some((province) => province.code === requestedProvinceCode)
    ? requestedProvinceCode
    : null;

  const { data: existingUser, error: userLookupError } = await supabase.client
    .from(USERS_TABLE)
    .select('id, role, is_active')
    .eq('email', email)
    .maybeSingle();

  if (userLookupError) {
    return NextResponse.json({ message: userLookupError.message }, { status: 500 });
  }

  if (existingUser && existingUser.role !== 'creator') {
    return NextResponse.json(
      { message: 'อีเมลนี้ถูกใช้งานกับบัญชีประเภทอื่น กรุณาเข้าสู่ระบบด้วยช่องทางเดิม' },
      { status: 409 }
    );
  }

  let userId = existingUser?.id as string | undefined;
  let isNewCreator = false;

  if (!userId) {
    const passwordHash = `sha256:${crypto.createHash('sha256').update(crypto.randomUUID()).digest('hex')}`;
    const { data: createdUser, error: createUserError } = await supabase.client
      .from(USERS_TABLE)
      .insert({
        username: email,
        email,
        password_hash: passwordHash,
        role: 'creator',
        is_active: false,
      })
      .select('id')
      .single();

    if (createUserError || !createdUser?.id) {
      return NextResponse.json(
        { message: createUserError?.message ?? 'สร้างบัญชีผู้ร่วมสร้างข้อมูลไม่สำเร็จ' },
        { status: 500 }
      );
    }

    userId = String(createdUser.id);
    isNewCreator = true;
  }

  let { data: profile, error: profileError } = await supabase.client
    .from('creator_profiles')
    .select(PROFILE_SELECT)
    .eq('user_id', userId)
    .maybeSingle();

  if (!profile && !profileError) {
    const result = await supabase.client
      .from('creator_profiles')
      .insert({
        user_id: userId,
        email,
        display_name: requestedDisplayName || displayName,
        phone: requestedPhone || null,
        province_code: provinceCode,
        bio: requestedBio || null,
        avatar_url: avatarUrl || null,
        status: 'pending',
      })
      .select(PROFILE_SELECT)
      .single();
    profile = result.data;
    profileError = result.error;
    isNewCreator = true;
  }

  if (profileError || !profile) {
    if (isNewCreator) await supabase.client.from(USERS_TABLE).delete().eq('id', userId);
    return NextResponse.json(
      { message: profileError?.message ?? 'สร้างโปรไฟล์ผู้ร่วมสร้างข้อมูลไม่สำเร็จ' },
      { status: 500 }
    );
  }

  const isApproved = profile.status === 'approved' && existingUser?.is_active === true;
  const creatorToken = isApproved ? createAdminToken(userId, 'creator') : null;

  if (isApproved && (!creatorToken || !creatorToken.ok)) {
    return NextResponse.json(
      { message: creatorToken?.error ?? 'สร้างข้อมูลเข้าสู่ระบบไม่สำเร็จ' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    data: mapCreatorProfile({ ...profile, is_active: existingUser?.is_active ?? false }),
    token: creatorToken?.ok ? creatorToken.token : null,
    isNewCreator,
  });
}
