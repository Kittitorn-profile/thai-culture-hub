import type { NextRequest } from 'next/server';

import { NextResponse } from 'next/server';

import { readAuthBody } from 'src/server/auth-request';

import { verifyPassword } from 'src/server/password';

import { getSupabaseAdmin } from 'src/server/supabase-admin';
import { createAdminToken } from 'src/server/admin-api-auth';

type AdminUserRow = {
  id?: string | number | null;
  email?: string | null;
  username?: string | null;
  password_hash?: string | null;
  is_active?: boolean | null;
  role?: string | null;
};

const ADMIN_USERS_TABLE = process.env.ADMIN_USERS_TABLE ?? 'user';

async function findUser(identity: string) {
  const supabase = getSupabaseAdmin();

  if (!supabase.ok) {
    return { ok: false as const, error: supabase.error };
  }

  const columns = 'id, email, username, password_hash, is_active, role';
  const usernameResult = await supabase.client
    .from(ADMIN_USERS_TABLE)
    .select(columns)
    .eq('username', identity)
    .maybeSingle();

  if (usernameResult.error) {
    return { ok: false as const, error: usernameResult.error.message };
  }

  if (usernameResult.data) {
    return { ok: true as const, user: usernameResult.data as AdminUserRow };
  }

  const emailResult = await supabase.client
    .from(ADMIN_USERS_TABLE)
    .select(columns)
    .eq('email', identity.toLowerCase())
    .maybeSingle();

  if (emailResult.error) {
    return { ok: false as const, error: emailResult.error.message };
  }

  return { ok: true as const, user: emailResult.data as AdminUserRow | null };
}

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const body = await readAuthBody(request);
  const rawIdentity = body.username ?? body.email;
  const identity = typeof rawIdentity === 'string' ? rawIdentity.trim() : '';
  const password = typeof body.password === 'string' ? body.password : '';

  if (!identity || !password) {
    return NextResponse.json(
      { message: 'กรุณากรอกชื่อผู้ใช้หรืออีเมลและรหัสผ่าน' },
      { status: 400 }
    );
  }

  const userResult = await findUser(identity);

  if (!userResult.ok) {
    return NextResponse.json({ message: userResult.error }, { status: 500 });
  }

  if (
    !userResult.user ||
    userResult.user.is_active === false ||
    (userResult.user.role === 'creator' && userResult.user.is_active !== true) ||
    !(await verifyPassword(password, userResult.user.password_hash?.trim()))
  ) {
    return NextResponse.json({ message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' }, { status: 401 });
  }

  if (userResult.user.role === 'creator') {
    if (body.acceptTerms !== true)
      return NextResponse.json({ message: 'กรุณายอมรับเงื่อนไขการใช้บริการ' }, { status: 400 });
    const supabase = getSupabaseAdmin();
    if (!supabase.ok)
      return NextResponse.json({ message: 'ไม่สามารถตรวจสอบบัญชีได้' }, { status: 500 });
    const { data: profile, error } = await supabase.client
      .from('creator_profiles')
      .select('status')
      .eq('user_id', userResult.user.id)
      .maybeSingle();
    if (error) return NextResponse.json({ message: 'ไม่สามารถตรวจสอบบัญชีได้' }, { status: 500 });
    if (!profile || profile.status !== 'approved')
      return NextResponse.json({ message: 'บัญชี Creator ยังไม่ได้รับอนุมัติ' }, { status: 403 });
  }

  const result = createAdminToken(`${userResult.user.id ?? identity}`, userResult.user.role);

  if (!result.ok) {
    return NextResponse.json({ message: result.error }, { status: 500 });
  }

  return NextResponse.json({
    token: result.token,
    expiresAt: result.expiresAt,
    user: {
      id: userResult.user.id,
      email: userResult.user.email,
      username: userResult.user.username,
      role: userResult.user.role,
    },
  });
}
