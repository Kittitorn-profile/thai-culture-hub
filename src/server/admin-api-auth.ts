import type { NextRequest } from 'next/server';

import crypto from 'node:crypto';

import { getSupabaseAdmin } from './supabase-admin';

const TOKEN_TTL_SECONDS = 60 * 60 * 8;

type AdminTokenPayload = {
  sub: string;
  role?: string | null;
  exp: number;
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

export async function verifyAdminRequest(request: NextRequest) {
  const authorization = request.headers.get('authorization');
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];

  if (!token) {
    return false;
  }

  const supabase = getSupabaseAdmin();

  if (!supabase.ok) {
    return false;
  }

  const { data, error } = await supabase.client.auth.getUser(token);

  return Boolean(!error && data.user);
}
