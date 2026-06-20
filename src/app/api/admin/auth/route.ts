import type { NextRequest } from 'next/server';

import crypto from 'node:crypto';
import { NextResponse } from 'next/server';

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

function sha256(value: string) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function safeCompare(value: string, expectedValue: string) {
  const valueBuffer = Buffer.from(value);
  const expectedValueBuffer = Buffer.from(expectedValue);

  return (
    valueBuffer.length === expectedValueBuffer.length &&
    crypto.timingSafeEqual(valueBuffer, expectedValueBuffer)
  );
}

function verifyPassword(password: string, user: AdminUserRow) {
  const passwordHash = user.password_hash?.trim();

  if (passwordHash) {
    if (passwordHash.startsWith('sha256:')) {
      return safeCompare(sha256(password), passwordHash.replace(/^sha256:/, ''));
    }

    if (passwordHash.startsWith('sha256$')) {
      return safeCompare(sha256(password), passwordHash.replace(/^sha256\$/, ''));
    }

    return safeCompare(password, passwordHash);
  }
  return false;
}

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
    .eq('email', identity)
    .maybeSingle();

  if (emailResult.error) {
    return { ok: false as const, error: emailResult.error.message };
  }

  return { ok: true as const, user: emailResult.data as AdminUserRow | null };
}

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as {
    username?: string;
    email?: string;
    password?: string;
  };
  const identity = (body.username ?? body.email ?? '').trim();
  const password = body.password ?? '';

  if (!identity || !password) {
    return NextResponse.json({ message: 'Username/email and password are required' }, { status: 400 });
  }

  const userResult = await findUser(identity);

  if (!userResult.ok) {
    return NextResponse.json({ message: userResult.error }, { status: 500 });
  }

  if (!userResult.user || userResult.user.is_active === false || !verifyPassword(password, userResult.user)) {
    return NextResponse.json({ message: 'Invalid username or password' }, { status: 401 });
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
