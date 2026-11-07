import type { NextRequest } from 'next/server';

import crypto from 'node:crypto';
import { NextResponse } from 'next/server';

import { hashPassword } from 'src/server/password';
import { readAuthBody } from 'src/server/auth-request';
import provinces from 'src/data/thailand-culture/provinces';
import { getSupabaseAdmin } from 'src/server/supabase-admin';
import { createAdminToken } from 'src/server/admin-api-auth';
import { cleanText, getBearerToken, mapCreatorProfile } from 'src/server/creator-auth';

export const runtime = 'nodejs';

const USERS_TABLE = process.env.ADMIN_USERS_TABLE ?? 'user';
const PROFILE_SELECT =
  'id, user_id, email, display_name, bio, phone, province_code, website_url, facebook_url, avatar_url, status, warning_note, warned_at, reviewed_at, reject_reason, created_at, updated_at';

export async function POST(request: NextRequest) {
  const body = await readAuthBody(request);
  const isLookup = body.intent === 'lookup';
  if (!isLookup && body.acceptTerms !== true)
    return NextResponse.json({ message: 'กรุณายอมรับเงื่อนไขการใช้บริการ' }, { status: 400 });
  const isRegistration = body.intent === 'register';
  if (!['register', 'sign-in', 'lookup'].includes(String(body.intent)))
    return NextResponse.json({ message: 'Invalid authentication intent' }, { status: 400 });
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
  const avatarUrl =
    cleanText(authUser.user_metadata?.avatar_url) || cleanText(authUser.user_metadata?.picture);
  const requestedDisplayName = cleanText(body.displayName);
  const requestedPhone = cleanText(body.phone);
  const requestedProvinceCode = cleanText(body.provinceCode);
  const requestedBio = cleanText(body.bio);
  const provinceCode = provinces.some((province) => province.code === requestedProvinceCode)
    ? requestedProvinceCode
    : null;

  if (isRegistration && (!provinceCode || !requestedDisplayName)) {
    return NextResponse.json({ message: 'กรุณากรอกชื่อที่แสดงและเลือกจังหวัด' }, { status: 400 });
  }

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
  let createdUserId: string | undefined;

  if (!userId && !isRegistration)
    return NextResponse.json(
      { message: 'ยังไม่มีบัญชี Creator กรุณาสมัครสมาชิกก่อน' },
      { status: 404 }
    );

  if (!userId && (!provinceCode || !requestedDisplayName)) {
    return NextResponse.json({ message: 'กรุณากรอกชื่อที่แสดงและเลือกจังหวัด' }, { status: 400 });
  }

  if (!userId) {
    const passwordHash = await hashPassword(crypto.randomUUID());
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
    createdUserId = userId;
    isNewCreator = true;
  }

  let { data: profile, error: profileError } = await supabase.client
    .from('creator_profiles')
    .select(PROFILE_SELECT)
    .eq('user_id', userId)
    .maybeSingle();

  if (!profile && !profileError && !isRegistration)
    return NextResponse.json(
      { message: 'ไม่พบโปรไฟล์ Creator กรุณาติดต่อทีมงาน' },
      { status: 403 }
    );

  if (!profile && !profileError && (!provinceCode || !requestedDisplayName)) {
    return NextResponse.json({ message: 'กรุณากรอกชื่อที่แสดงและเลือกจังหวัด' }, { status: 400 });
  }

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
    if (createdUserId) await supabase.client.from(USERS_TABLE).delete().eq('id', createdUserId);
    return NextResponse.json(
      { message: profileError?.message ?? 'สร้างโปรไฟล์ผู้ร่วมสร้างข้อมูลไม่สำเร็จ' },
      { status: 500 }
    );
  }

  if (!isLookup && !profile.avatar_url && avatarUrl) {
    const avatarUpdate = await supabase.client
      .from('creator_profiles')
      .update({ avatar_url: avatarUrl })
      .eq('id', profile.id)
      .or('avatar_url.is.null,avatar_url.eq.')
      .select(PROFILE_SELECT)
      .maybeSingle();
    if (avatarUpdate.error)
      return NextResponse.json(
        { message: 'บันทึกรูปโปรไฟล์ Google ไม่สำเร็จ กรุณาลองใหม่' },
        { status: 500 }
      );
    if (avatarUpdate.data) profile = avatarUpdate.data;
  }

  // App metadata is server-controlled; never replace an existing administrator role.
  if (!isLookup && !authUser.app_metadata?.role) {
    const { error: roleError } = await supabase.client.auth.admin.updateUserById(authUser.id, {
      app_metadata: { ...authUser.app_metadata, role: 'creator' },
    });
    if (roleError)
      return NextResponse.json(
        { message: 'ตั้งค่าสิทธิ์สมาชิกไม่สำเร็จ กรุณาลองใหม่' },
        { status: 500 }
      );
  }

  if (
    profile.status === 'rejected' ||
    (profile.status === 'approved' && existingUser?.is_active !== true)
  ) {
    return NextResponse.json(
      {
        message:
          profile.status === 'approved'
            ? 'บัญชีนี้ได้รับอนุมัติแล้ว แต่ถูกปิดใช้งาน กรุณาติดต่อผู้ดูแลเพื่อเปิดใช้งานบัญชี'
            : 'คำขอของบัญชีนี้ไม่ได้รับอนุมัติ กรุณาติดต่อทีมงาน',
      },
      { status: 403 }
    );
  }

  if (!['approved', 'pending'].includes(profile.status))
    return NextResponse.json(
      { message: 'สถานะบัญชีไม่พร้อมใช้งาน กรุณาติดต่อทีมงาน' },
      { status: 403 }
    );
  if (isLookup)
    return NextResponse.json({
      outcome: 'existing',
      data: { status: profile.status, isActive: existingUser?.is_active === true },
    });

  const isApproved = profile.status === 'approved' && existingUser?.is_active === true;
  const creatorToken = isApproved ? createAdminToken(userId, 'creator') : null;

  if (isApproved && (!creatorToken || !creatorToken.ok)) {
    return NextResponse.json(
      { message: creatorToken?.error ?? 'สร้างข้อมูลเข้าสู่ระบบไม่สำเร็จ' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    outcome: isApproved ? 'signed_in' : isNewCreator ? 'registration_submitted' : 'pending',
    data: mapCreatorProfile({ ...profile, is_active: existingUser?.is_active ?? false }),
    token: creatorToken?.ok ? creatorToken.token : null,
    isNewCreator,
  });
}
