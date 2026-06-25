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

  if (role === ADMIN_ROLE.reviewer) {
    return ADMIN_ROLE.reviewer;
  }

  return role === ADMIN_ROLE.manage ? ADMIN_ROLE.manage : ADMIN_ROLE.admin;
}

function getUserDisplayName(firstName: string, lastName: string, fallback: string) {
  return `${firstName} ${lastName}`.trim() || fallback;
}

function getUserIsActive(user: unknown) {
  const bannedUntilValue =
    typeof user === 'object' && user !== null && 'banned_until' in user
      ? (user.banned_until as unknown)
      : null;

  if (typeof bannedUntilValue !== 'string' || !bannedUntilValue) {
    return true;
  }

  const bannedUntil = new Date(bannedUntilValue).getTime();

  return Number.isNaN(bannedUntil) || bannedUntil <= Date.now();
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
      isActive: getUserIsActive(user),
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
  const isActive = typeof body.isActive === 'boolean' ? body.isActive : true;
  const permissions =
    role === ADMIN_ROLE.admin
      ? ALL_ADMIN_PERMISSIONS
      : role === ADMIN_ROLE.reviewer
        ? [ADMIN_PERMISSION.creators]
        : normalizePermissions(body.permissions);

  if (!email || !password) {
    return NextResponse.json({ message: 'Email and password are required' }, { status: 400 });
  }

  if (password.length < 6) {
    return NextResponse.json({ message: 'Password must be at least 6 characters' }, { status: 400 });
  }

  if ((role === ADMIN_ROLE.manage || role === ADMIN_ROLE.reviewer) && !permissions.length) {
    return NextResponse.json({ message: 'Select at least one permission' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  if (!supabase.ok) {
    return NextResponse.json({ message: supabase.error }, { status: 500 });
  }

  const displayName = getUserDisplayName(firstName, lastName, email);
  const { data, error } = await supabase.client.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: {
      role,
      admin_permissions: permissions,
    },
    ban_duration: isActive ? 'none' : '876000h',
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
        isActive: getUserIsActive(data.user),
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
  const nextEmail = cleanText(body.email).toLowerCase();
  const nextPassword = cleanText(body.password);
  const firstName = cleanText(body.firstName);
  const lastName = cleanText(body.lastName);
  const hasActiveChange = typeof body.isActive === 'boolean';

  if (!userId) {
    return NextResponse.json({ message: 'User id is required' }, { status: 400 });
  }

  if (hasActiveChange && body.isActive === false && userId === auth.user.id) {
    return NextResponse.json({ message: 'You cannot deactivate your own user' }, { status: 400 });
  }

  if (nextPassword && nextPassword.length < 6) {
    return NextResponse.json({ message: 'Password must be at least 6 characters' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  if (!supabase.ok) {
    return NextResponse.json({ message: supabase.error }, { status: 500 });
  }

  const currentResult = await supabase.client.auth.admin.getUserById(userId);

  if (currentResult.error || !currentResult.data.user) {
    return NextResponse.json(
      { message: currentResult.error?.message ?? 'User not found' },
      { status: currentResult.error ? 500 : 404 }
    );
  }

  const currentUser = currentResult.data.user;
  const currentAppMetadata = currentUser.app_metadata ?? {};
  const currentUserMetadata = currentUser.user_metadata ?? {};
  const role =
    typeof body.role === 'string'
      ? normalizeRole(body.role)
      : typeof currentAppMetadata.role === 'string'
        ? currentAppMetadata.role
        : ADMIN_ROLE.admin;
  const permissions =
    role === ADMIN_ROLE.admin
      ? ALL_ADMIN_PERMISSIONS
      : Array.isArray(body.permissions)
        ? normalizePermissions(body.permissions)
        : Array.isArray(currentAppMetadata.admin_permissions)
          ? normalizePermissions(currentAppMetadata.admin_permissions)
          : [];

  if ((role === ADMIN_ROLE.manage || role === ADMIN_ROLE.reviewer) && !permissions.length) {
    return NextResponse.json({ message: 'Select at least one permission' }, { status: 400 });
  }

  const updatePayload: Parameters<typeof supabase.client.auth.admin.updateUserById>[1] & {
    ban_duration?: string;
  } = {
    app_metadata: {
      ...currentAppMetadata,
      role,
      admin_permissions: permissions,
    },
  };

  if (nextEmail) {
    updatePayload.email = nextEmail;
    updatePayload.email_confirm = true;
  }

  if (nextPassword) {
    updatePayload.password = nextPassword;
  }

  if (hasActiveChange) {
    updatePayload.ban_duration = body.isActive ? 'none' : '876000h';
  }

  if ('firstName' in body || 'lastName' in body) {
    const resolvedFirstName =
      'firstName' in body ? firstName : typeof currentUserMetadata.first_name === 'string' ? currentUserMetadata.first_name : '';
    const resolvedLastName =
      'lastName' in body ? lastName : typeof currentUserMetadata.last_name === 'string' ? currentUserMetadata.last_name : '';

    updatePayload.user_metadata = {
      ...currentUserMetadata,
      first_name: resolvedFirstName,
      last_name: resolvedLastName,
      display_name: getUserDisplayName(resolvedFirstName, resolvedLastName, nextEmail || (currentUser.email ?? '')),
    };
  }

  const { data, error } = await supabase.client.auth.admin.updateUserById(userId, {
    ...updatePayload,
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
      isActive: getUserIsActive(data.user),
      firstName: data.user.user_metadata?.first_name ?? '',
      lastName: data.user.user_metadata?.last_name ?? '',
      displayName: data.user.user_metadata?.display_name ?? '',
    },
  });
}

export async function DELETE(request: NextRequest) {
  const auth = await requireUsersAdmin(request);

  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const userId = cleanText(body.id);

  if (!userId) {
    return NextResponse.json({ message: 'User id is required' }, { status: 400 });
  }

  if (userId === auth.user.id) {
    return NextResponse.json({ message: 'You cannot delete your own user' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  if (!supabase.ok) {
    return NextResponse.json({ message: supabase.error }, { status: 500 });
  }

  const { error } = await supabase.client.auth.admin.deleteUser(userId);

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: 'User deleted' });
}
