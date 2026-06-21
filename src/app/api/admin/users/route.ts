import type { NextRequest } from 'next/server';

import { NextResponse } from 'next/server';

import { getSupabaseAdmin } from 'src/server/supabase-admin';
import { verifyAdminAccessToken } from 'src/server/admin-api-auth';

import {
  ADMIN_ROLE,
  ADMIN_PERMISSION,
  type AdminPermission,
  ALL_ADMIN_PERMISSIONS,
} from 'src/auth/admin-permissions';

export const runtime = 'nodejs';

function getBearerToken(request: NextRequest) {
  return request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1] ?? '';
}

function cleanText(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeRole(value: unknown) {
  const role = cleanText(value);

  return role === ADMIN_ROLE.manage ? ADMIN_ROLE.manage : ADMIN_ROLE.admin;
}

function normalizePermissions(value: unknown): AdminPermission[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((permission): permission is AdminPermission =>
    ALL_ADMIN_PERMISSIONS.includes(permission)
  );
}

async function requireUsersAdmin(request: NextRequest) {
  return verifyAdminAccessToken(getBearerToken(request), ADMIN_PERMISSION.users);
}

export async function GET(request: NextRequest) {
  const auth = await requireUsersAdmin(request);

  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  const supabase = getSupabaseAdmin();

  if (!supabase.ok) {
    return NextResponse.json({ message: supabase.error }, { status: 500 });
  }

  const { data, error } = await supabase.client.auth.admin.listUsers({ page: 1, perPage: 200 });

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({
    data: data.users.map((user) => ({
      id: user.id,
      email: user.email,
      createdAt: user.created_at,
      lastSignInAt: user.last_sign_in_at,
      role: user.app_metadata?.role ?? ADMIN_ROLE.admin,
      permissions: user.app_metadata?.admin_permissions ?? ALL_ADMIN_PERMISSIONS,
      firstName: user.user_metadata?.first_name ?? '',
      lastName: user.user_metadata?.last_name ?? '',
      displayName: user.user_metadata?.display_name ?? '',
    })),
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireUsersAdmin(request);

  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const email = cleanText(body.email).toLowerCase();
  const password = cleanText(body.password);
  const firstName = cleanText(body.firstName);
  const lastName = cleanText(body.lastName);
  const role = normalizeRole(body.role);
  const permissions =
    role === ADMIN_ROLE.admin ? ALL_ADMIN_PERMISSIONS : normalizePermissions(body.permissions);

  if (!email || !password) {
    return NextResponse.json({ message: 'Email and password are required' }, { status: 400 });
  }

  if (password.length < 6) {
    return NextResponse.json({ message: 'Password must be at least 6 characters' }, { status: 400 });
  }

  if (role === ADMIN_ROLE.manage && !permissions.length) {
    return NextResponse.json({ message: 'Select at least one permission' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  if (!supabase.ok) {
    return NextResponse.json({ message: supabase.error }, { status: 500 });
  }

  const displayName = `${firstName} ${lastName}`.trim();
  const { data, error } = await supabase.client.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: {
      role,
      admin_permissions: permissions,
    },
    user_metadata: {
      first_name: firstName,
      last_name: lastName,
      display_name: displayName || email,
    },
  });

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json(
    {
      data: {
        id: data.user.id,
        email: data.user.email,
        role,
        permissions,
        displayName: displayName || email,
      },
    },
    { status: 201 }
  );
}

export async function PATCH(request: NextRequest) {
  const auth = await requireUsersAdmin(request);

  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const userId = cleanText(body.id);
  const role = normalizeRole(body.role);
  const permissions =
    role === ADMIN_ROLE.admin ? ALL_ADMIN_PERMISSIONS : normalizePermissions(body.permissions);

  if (!userId) {
    return NextResponse.json({ message: 'User id is required' }, { status: 400 });
  }

  if (role === ADMIN_ROLE.manage && !permissions.length) {
    return NextResponse.json({ message: 'Select at least one permission' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  if (!supabase.ok) {
    return NextResponse.json({ message: supabase.error }, { status: 500 });
  }

  const { data, error } = await supabase.client.auth.admin.updateUserById(userId, {
    app_metadata: {
      role,
      admin_permissions: permissions,
    },
  });

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({
    data: {
      id: data.user.id,
      email: data.user.email,
      role,
      permissions,
    },
  });
}
