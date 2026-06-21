import type { NextRequest } from 'next/server';

import crypto from 'node:crypto';

import { isSuperAdminRole, type AdminPermission } from 'src/auth/admin-permissions';

import { getSupabaseAdmin } from './supabase-admin';

const TOKEN_TTL_SECONDS = 60 * 60 * 8;

type AdminTokenPayload = {
  sub: string;
  role?: string | null;
  exp: number;
};

export type VerifiedAdminUser = {
  id: string;
  email?: string;
  displayName?: string;
  role: string;
  permissions: string[];
};

function base64UrlEncode(value: string) {
  return Buffer.from(value).toString('base64url');
}

function getAdminSecret() {
  return process.env.ADMIN_AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? '';
}

export function hasAdminAuthConfig() {
  return Boolean(getAdminSecret());
}

export function createAdminToken(userId: string, role?: string | null) {
  const secret = getAdminSecret();

  if (!secret) {
    return { ok: false as const, error: 'Missing ADMIN_AUTH_SECRET or NEXTAUTH_SECRET' };
  }

  const payload: AdminTokenPayload = {
    sub: userId,
    role,
    exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS,
  };
  const body = base64UrlEncode(JSON.stringify(payload));
  const signature = crypto.createHmac('sha256', secret).update(body).digest('base64url');

  return { ok: true as const, token: `${body}.${signature}`, expiresAt: payload.exp };
}

function canAccessPermission(user: VerifiedAdminUser, permission?: AdminPermission) {
  if (!permission) {
    return true;
  }

  if (isSuperAdminRole(user.role)) {
    return true;
  }

  return user.permissions.includes(permission);
}

export async function verifyAdminAccessToken(accessToken: string, permission?: AdminPermission) {
  if (!accessToken) {
    return { ok: false as const, status: 401, message: 'Unauthorized' };
  }


  const supabase = getSupabaseAdmin();

  if (!supabase.ok) {
    return { ok: false as const, status: 500, message: supabase.error };
  }

  const { data, error } = await supabase.client.auth.getUser(accessToken);

  if (error || !data.user) {
    return { ok: false as const, status: 401, message: 'Unauthorized' };
  }

  const appMetadata = data.user.app_metadata ?? {};
  const userMetadata = data.user.user_metadata ?? {};
  const user: VerifiedAdminUser = {
    id: data.user.id,
    email: data.user.email,
    displayName:
      typeof userMetadata.display_name === 'string'
        ? userMetadata.display_name
        : data.user.email,
    role: typeof appMetadata.role === 'string' ? appMetadata.role : 'admin',
    permissions: Array.isArray(appMetadata.admin_permissions) ? appMetadata.admin_permissions : [],
  };

  if (!canAccessPermission(user, permission)) {
    return { ok: false as const, status: 403, message: 'Forbidden' };
  }

  return { ok: true as const, user };
}

export async function verifyAdminRequest(request: NextRequest, permission?: AdminPermission) {
  const authorization = request.headers.get('authorization');
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1] ?? '';
  const result = await verifyAdminAccessToken(token, permission);

  return result.ok;
}
