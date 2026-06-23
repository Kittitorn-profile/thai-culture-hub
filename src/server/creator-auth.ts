import type { User } from '@supabase/supabase-js';

import crypto from 'node:crypto';

import { getSupabaseAdmin } from './supabase-admin';

export type CreatorStatus = 'pending' | 'approved' | 'rejected';
export type CreatorArticleStatus = 'draft' | 'pending_review' | 'approved' | 'rejected' | 'published';

export type CreatorProfileRow = {
  id: string;
  user_id: string;
  email: string;
  display_name: string;
  bio: string | null;
  phone: string | null;
  province_code: string | null;
  website_url: string | null;
  facebook_url: string | null;
  avatar_url: string | null;
  status: CreatorStatus;
  reviewed_at: string | null;
  reject_reason: string | null;
  created_at: string;
  updated_at: string;
};

export type CreatorArticleRow = {
  id: string;
  creator_id: string;
  category_key?: string | null;
  category_label?: string | null;
  title: string;
  slug: string;
  excerpt: string | null;
  cover_image_url: string | null;
  content_html: string;
  status: CreatorArticleStatus;
  submitted_at: string | null;
  reviewed_at: string | null;
  reject_reason: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  creator_profiles?: Pick<CreatorProfileRow, 'display_name' | 'email'> | null;
};

export function getBearerToken(headers: Headers) {
  return headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1] ?? '';
}

export function cleanText(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

export function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^\w\s-]/g, '')
      .trim()
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '') || `article-${Date.now()}`
  );
}

function safeCompare(value: string, expectedValue: string) {
  const valueBuffer = Buffer.from(value);
  const expectedValueBuffer = Buffer.from(expectedValue);

  return (
    valueBuffer.length === expectedValueBuffer.length &&
    crypto.timingSafeEqual(valueBuffer, expectedValueBuffer)
  );
}

function verifyCreatorTableToken(accessToken: string) {
  const secret = process.env.ADMIN_AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? '';
  const [body, signature] = accessToken.split('.');

  if (!secret || !body || !signature) {
    return null;
  }

  const expectedSignature = crypto.createHmac('sha256', secret).update(body).digest('base64url');

  if (!safeCompare(signature, expectedSignature)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as {
      sub?: string;
      role?: string | null;
      exp?: number;
    };

    if (!payload.sub || payload.role !== 'creator' || !payload.exp || payload.exp < Date.now() / 1000) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export function mapCreatorProfile(row: CreatorProfileRow) {
  return {
    id: row.id,
    userId: row.user_id,
    email: row.email,
    displayName: row.display_name,
    bio: row.bio ?? '',
    phone: row.phone ?? '',
    provinceCode: row.province_code ?? '',
    websiteUrl: row.website_url ?? '',
    facebookUrl: row.facebook_url ?? '',
    avatarUrl: row.avatar_url ?? '',
    status: row.status,
    reviewedAt: row.reviewed_at ?? '',
    rejectReason: row.reject_reason ?? '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapCreatorArticle(row: CreatorArticleRow) {
  return {
    id: row.id,
    creatorId: row.creator_id,
    categoryKey: row.category_key ?? '',
    categoryLabel: row.category_label ?? '',
    title: row.title,
    slug: row.slug,
    excerpt: row.excerpt ?? '',
    coverImageUrl: row.cover_image_url ?? '',
    contentHtml: row.content_html ?? '',
    status: row.status,
    submittedAt: row.submitted_at ?? '',
    reviewedAt: row.reviewed_at ?? '',
    rejectReason: row.reject_reason ?? '',
    publishedAt: row.published_at ?? '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    creatorName: row.creator_profiles?.display_name ?? '',
    creatorEmail: row.creator_profiles?.email ?? '',
  };
}

export async function verifyCreatorAccessToken(accessToken: string) {
  if (!accessToken) {
    return { ok: false as const, status: 401, message: 'Unauthorized' };
  }

  const supabase = getSupabaseAdmin();

  if (!supabase.ok) {
    return { ok: false as const, status: 500, message: supabase.error };
  }

  const { data, error } = await supabase.client.auth.getUser(accessToken);

  if (!error && data.user) {
    return { ok: true as const, supabase: supabase.client, user: data.user as User };
  }

  const creatorTokenPayload = verifyCreatorTableToken(accessToken);

  if (!creatorTokenPayload) {
    return { ok: false as const, status: 401, message: 'Unauthorized' };
  }

  return {
    ok: true as const,
    supabase: supabase.client,
    user: {
      id: creatorTokenPayload.sub,
      email: '',
      app_metadata: { role: 'creator' },
      user_metadata: {},
    } as unknown as User,
  };
}

export async function getCreatorProfileByUserId(userId: string) {
  const supabase = getSupabaseAdmin();

  if (!supabase.ok) {
    return { ok: false as const, status: 500, message: supabase.error };
  }

  const { data, error } = await supabase.client
    .from('creator_profiles')
    .select(
      'id, user_id, email, display_name, bio, phone, province_code, website_url, facebook_url, avatar_url, status, reviewed_at, reject_reason, created_at, updated_at'
    )
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    return { ok: false as const, status: 500, message: error.message };
  }

  if (!data) {
    return { ok: false as const, status: 404, message: 'Creator profile not found' };
  }

  return { ok: true as const, profile: data as CreatorProfileRow };
}
